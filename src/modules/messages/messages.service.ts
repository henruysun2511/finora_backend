import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { DirectMessageRepository } from './repositories/direct-message.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMapper } from './mapper/message.mapper';
import { MessagesGateway } from './gateways/messages.gateway';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionVisibility } from '../../common/enums/transaction-visibility.enum';
import { FriendshipStatus } from '../friends/enums/friendship-status.enum';
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
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly messageRepo: DirectMessageRepository,
    private readonly reactionRepo: MessageReactionRepository,
    private readonly messageMapper: MessageMapper,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  // ── API 3: Gửi tin nhắn mới ──────────────────────────────────────────────

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    await this.assertCanMessage(userId, dto.receiverId);

    if (dto.replyToMessageId) {
      const replyTo = await this.messageRepo.findById(dto.replyToMessageId);
      if (
        !replyTo ||
        !this.isConversationParticipantPair(
          replyTo.senderId,
          replyTo.receiverId,
          userId,
          dto.receiverId,
        )
      ) {
        throw new MessageNotFoundException();
      }
    }

    if (dto.relatedTransactionId) {
      const transaction = await this.transactionsService.findEntityById(
        dto.relatedTransactionId,
      );
      if (
        !transaction ||
        transaction.createdBy !== dto.receiverId ||
        transaction.visibility !== TransactionVisibility.FRIENDS
      ) {
        throw new MessageNotFoundException();
      }
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
    if (!full) {
      throw new MessageNotFoundException();
    }
    const responseDto = this.messageMapper.toResponse(full);

    // Phát tin nhắn qua Socket.IO tới receiver
    this.messagesGateway.sendMessageToUser(dto.receiverId, responseDto);

    // Gửi push notification (không chặn luồng chính)
    void this.sendNotificationSafe({
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
    await this.assertCanMessage(userId, friendId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    let skip = (page - 1) * limit;
    let beforeCreatedAt: Date | undefined;

    if (query.before) {
      const cursor = await this.messageRepo.findById(query.before);
      if (
        !cursor ||
        !(
          (cursor.senderId === userId && cursor.receiverId === friendId) ||
          (cursor.senderId === friendId && cursor.receiverId === userId)
        )
      ) {
        throw new MessageNotFoundException();
      }

      beforeCreatedAt = cursor.createdAt;
      skip = 0;
    }

    const [messages, total] = await this.messageRepo.findHistory(
      userId,
      friendId,
      skip,
      limit,
      beforeCreatedAt,
      query.before,
    );

    const items = messages.map((m) => this.messageMapper.toResponse(m));
    return { items, total };
  }

  // ── API 4: Đánh dấu đã đọc ──────────────────────────────────────────────

  async markAsRead(
    userId: string,
    friendId: string,
  ): Promise<{ markedCount: number }> {
    await this.assertCanMessage(userId, friendId);
    const markedCount = await this.messageRepo.markAllAsRead(friendId, userId);
    return { markedCount };
  }

  // ── API 5: Thu hồi tin nhắn ──────────────────────────────────────────────

  async recallMessage(
    userId: string,
    messageId: string,
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.senderId !== userId) {
      throw new MessageNotFoundException();
    }

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
  ): Promise<{ success: true; emoji: string }> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new MessageNotFoundException();
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new MessageNotFoundException();
    }

    const otherUserId =
      message.senderId === userId ? message.receiverId : message.senderId;
    await this.assertCanMessage(userId, otherUserId);

    await this.reactionRepo.upsertReaction(messageId, userId, dto.emoji);
    const emoji = dto.emoji.toUpperCase();
    this.messagesGateway.sendReactionUpdatedToUser(otherUserId, {
      messageId,
      userId,
      emoji,
    });

    void this.sendNotificationSafe({
      userId: otherUserId,
      type: NotificationType.MESSAGE_REACTED,
      title: 'Cảm xúc mới trên tin nhắn',
      body: `Đã thả ${emoji} vào tin nhắn của bạn`,
      relatedEntityType: 'DIRECT_MESSAGE',
      relatedEntityId: messageId,
    });

    return { success: true, emoji };
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

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new MessageNotFoundException();
    }

    const otherUserId =
      message.senderId === userId ? message.receiverId : message.senderId;
    await this.assertCanMessage(userId, otherUserId);

    await this.reactionRepo.deleteReaction(messageId, userId);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  private async sendNotificationSafe(dto: CreateNotificationDto): Promise<void> {
    try {
      await this.notificationsService.createNotification(dto);
    } catch (error) {
      this.logger.error(
        `Failed to create message notification for user ${dto.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async assertCanMessage(userId: string, friendId: string): Promise<void> {
    if (await this.friendsService.areFriends(userId, friendId)) {
      return;
    }

    const relation = await this.friendsService.getStatus(userId, friendId);
    if (relation.status === FriendshipStatus.BLOCKED) {
      throw new UserBlockedException();
    }

    throw new CannotMessageNonFriendException();
  }

  private isConversationParticipantPair(
    senderId: string,
    receiverId: string,
    userA: string,
    userB: string,
  ): boolean {
    return (
      (senderId === userA && receiverId === userB) ||
      (senderId === userB && receiverId === userA)
    );
  }
}
