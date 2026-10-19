import { Injectable } from '@nestjs/common';
import { DirectMessageRepository } from './repositories/direct-message.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMapper } from './mapper/message.mapper';
import { MessagesGateway } from './gateways/messages.gateway';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto } from './dto/request/send-message.dto';
import { MessageHistoryQueryDto } from './dto/request/message-history-query.dto';
import { AddMessageReactionDto } from './dto/request/add-message-reaction.dto';
import { MessageResponseDto } from './dto/response/message-response.dto';
import { ConversationResponseDto } from './dto/response/conversation-response.dto';
import {
  MessageNotFoundException,
  CannotMessageNonFriendException,
  MessageRecallTimeoutException,
  UserBlockedException,
} from './exceptions/message.exception';
import { MESSAGE_RECALL_LIMIT_MINUTES } from './messages.constant';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { CreateNotificationDto } from '../notifications/dto/request/create-notification.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messageRepo: DirectMessageRepository,
    private readonly reactionRepo: MessageReactionRepository,
    private readonly messageMapper: MessageMapper,
    private readonly messagesGateway: MessagesGateway,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── API 3: Gửi tin nhắn mới ──────────────────────────────────────────────

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Kiểm tra quan hệ bạn bè
    const areFriends = await this.friendsService.areFriends(userId, dto.receiverId);
    if (!areFriends) {
      throw new CannotMessageNonFriendException();
    }

    const message = this.messageRepo.create({
      senderId: userId,
      receiverId: dto.receiverId,
      content: dto.content,
      replyToMessageId: dto.replyToMessageId,
      relatedTransactionId: dto.relatedTransactionId,
      isRead: false,
    });

    const saved = await this.messageRepo.save(message);

    // Reload with relations để map response
    const full = await this.messageRepo.findById(saved.id);
    const responseDto = this.messageMapper.toResponse(full!);

    // Phát tin nhắn qua Socket.IO tới receiver
    this.messagesGateway.sendMessageToUser(dto.receiverId, responseDto);

    // Gửi push notification (không chặn luồng chính)
    this.sendNotificationSafe({
      userId: dto.receiverId,
      type: NotificationType.NEW_DIRECT_MESSAGE,
      title: 'Tin nhắn mới',
      body: dto.content.length > 100 ? dto.content.substring(0, 100) + '...' : dto.content,
      relatedEntityType: 'DIRECT_MESSAGE',
      relatedEntityId: saved.id,
    });

    return responseDto;
  }

  // ── API 1: Danh sách cuộc trò chuyện ─────────────────────────────────────

  async getConversations(
    userId: string,
    search?: string,
  ): Promise<ConversationResponseDto[]> {
    return this.messageRepo.findRecentConversations(userId, search);
  }

  // ── API 2: Lịch sử tin nhắn với bạn bè ──────────────────────────────────

  async getHistory(
    userId: string,
    friendId: string,
    query: MessageHistoryQueryDto,
  ): Promise<{ items: MessageResponseDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepo.findHistory(
      userId,
      friendId,
      skip,
      limit,
    );

    const items = messages.map((m) => this.messageMapper.toResponse(m));
    return { items, total };
  }

  // ── API 4: Đánh dấu đã đọc ──────────────────────────────────────────────

  async markAsRead(
    userId: string,
    friendId: string,
  ): Promise<{ affected: number }> {
    // Đánh dấu tất cả tin nhắn mà friendId gửi cho userId thành đã đọc
    const affected = await this.messageRepo.markAllAsRead(friendId, userId);
    return { affected };
  }

  // ── API 5: Thu hồi tin nhắn ──────────────────────────────────────────────

  async recallMessage(
    userId: string,
    messageId: string,
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundException();
    }

    // Chỉ người gửi mới được thu hồi
    if (message.senderId !== userId) {
      throw new MessageNotFoundException();
    }

    // Kiểm tra thời gian 15 phút
    const diffMs = Date.now() - message.createdAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    if (diffMinutes > MESSAGE_RECALL_LIMIT_MINUTES) {
      throw new MessageRecallTimeoutException();
    }

    // Xóa mềm
    await this.messageRepo.softDelete(messageId);

    // Phát sự kiện thu hồi qua Socket cho cả 2 bên
    this.messagesGateway.sendRecalledToUser(message.senderId, messageId);
    this.messagesGateway.sendRecalledToUser(message.receiverId, messageId);
  }

  // ── API 6: Thả cảm xúc vào tin nhắn ─────────────────────────────────────

  async addReaction(
    userId: string,
    messageId: string,
    dto: AddMessageReactionDto,
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundException();
    }

    // Chỉ 2 bên tham gia cuộc trò chuyện mới được react
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new MessageNotFoundException();
    }

    await this.reactionRepo.upsertReaction(messageId, userId, dto.emoji);

    // Gửi push notification cho người còn lại
    const targetUserId = message.senderId === userId ? message.receiverId : message.senderId;
    this.sendNotificationSafe({
      userId: targetUserId,
      type: NotificationType.MESSAGE_REACTED,
      title: 'Cảm xúc mới trên tin nhắn',
      body: `Đã thả ${dto.emoji} vào tin nhắn của bạn`,
      relatedEntityType: 'DIRECT_MESSAGE',
      relatedEntityId: messageId,
    });
  }

  // ── API 7: Gỡ cảm xúc ───────────────────────────────────────────────────

  async removeReaction(
    userId: string,
    messageId: string,
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundException();
    }

    await this.reactionRepo.deleteReaction(messageId, userId);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  private async sendNotificationSafe(dto: CreateNotificationDto): Promise<void> {
    try {
      await this.notificationsService.createNotification(dto);
    } catch {
      // Bỏ qua lỗi thông báo để không ảnh hưởng nghiệp vụ chính
    }
  }
}
