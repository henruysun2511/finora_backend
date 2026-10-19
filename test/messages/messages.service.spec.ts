import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from '../../src/modules/messages/messages.service';
import { DirectMessageRepository } from '../../src/modules/messages/repositories/direct-message.repository';
import { MessageReactionRepository } from '../../src/modules/messages/repositories/message-reaction.repository';
import { MessageMapper } from '../../src/modules/messages/mapper/message.mapper';
import { MessagesGateway } from '../../src/modules/messages/gateways/messages.gateway';
import { FriendsService } from '../../src/modules/friends/friends.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { SendMessageDto } from '../../src/modules/messages/dto/request/send-message.dto';
import { AddMessageReactionDto } from '../../src/modules/messages/dto/request/add-message-reaction.dto';
import { DirectMessage } from '../../src/modules/messages/entities/direct-message.entity';
import {
  MessageNotFoundException,
  CannotMessageNonFriendException,
  MessageRecallTimeoutException,
} from '../../src/modules/messages/exceptions/message.exception';
import { ReactionEmoji } from '../../src/common/enums/reaction-emoji.enum';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageRepo: jest.Mocked<Partial<DirectMessageRepository>>;
  let reactionRepo: jest.Mocked<Partial<MessageReactionRepository>>;
  let messagesGateway: jest.Mocked<Partial<MessagesGateway>>;
  let friendsService: jest.Mocked<Partial<FriendsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockFriendId = '22222222-2222-2222-2222-222222222222';
  const mockMessageId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    messageRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findHistory: jest.fn(),
      findRecentConversations: jest.fn(),
      markAllAsRead: jest.fn(),
      softDelete: jest.fn(),
    };

    reactionRepo = {
      upsertReaction: jest.fn(),
      deleteReaction: jest.fn(),
    };

    messagesGateway = {
      sendMessageToUser: jest.fn(),
      sendRecalledToUser: jest.fn(),
    };

    friendsService = {
      areFriends: jest.fn(),
    };

    notificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        MessageMapper,
        { provide: DirectMessageRepository, useValue: messageRepo },
        { provide: MessageReactionRepository, useValue: reactionRepo },
        { provide: MessagesGateway, useValue: messagesGateway },
        { provide: FriendsService, useValue: friendsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  // ── sendMessage ──────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    const dto: SendMessageDto = {
      receiverId: mockFriendId,
      content: 'Chuyển cho mình 200k nhé!',
    };

    it('nên gửi tin nhắn thành công khi 2 người là bạn bè', async () => {
      friendsService.areFriends!.mockResolvedValue(true);

      const createdMessage = {
        id: mockMessageId,
        senderId: mockUserId,
        receiverId: mockFriendId,
        content: dto.content,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DirectMessage;

      messageRepo.create!.mockReturnValue(createdMessage);
      messageRepo.save!.mockResolvedValue(createdMessage);
      messageRepo.findById!.mockResolvedValue({
        ...createdMessage,
        reactions: [],
        replyToMessage: null,
      } as any);

      const result = await service.sendMessage(mockUserId, dto);

      expect(friendsService.areFriends).toHaveBeenCalledWith(mockUserId, mockFriendId);
      expect(messageRepo.create).toHaveBeenCalled();
      expect(messageRepo.save).toHaveBeenCalled();
      expect(messagesGateway.sendMessageToUser).toHaveBeenCalledWith(
        mockFriendId,
        expect.objectContaining({ id: mockMessageId }),
      );
      expect(result.id).toBe(mockMessageId);
      expect(result.content).toBe(dto.content);
    });

    it('nên ném CannotMessageNonFriendException khi 2 người không phải bạn bè', async () => {
      friendsService.areFriends!.mockResolvedValue(false);

      await expect(service.sendMessage(mockUserId, dto)).rejects.toThrow(
        CannotMessageNonFriendException,
      );

      expect(messageRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── getConversations ─────────────────────────────────────────────────────

  describe('getConversations', () => {
    it('nên trả về danh sách cuộc trò chuyện', async () => {
      const mockConversations = [
        {
          friendId: mockFriendId,
          friendFullName: 'Nguyễn Văn A',
          friendAvatar: null,
          lastMessageContent: 'Hello',
          lastMessageSenderId: mockFriendId,
          lastMessageAt: new Date(),
          unreadCount: 2,
        },
      ];

      messageRepo.findRecentConversations!.mockResolvedValue(mockConversations);

      const result = await service.getConversations(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].friendId).toBe(mockFriendId);
      expect(result[0].unreadCount).toBe(2);
    });
  });

  // ── getHistory ───────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('nên trả về lịch sử tin nhắn phân trang', async () => {
      const mockMessages = [
        {
          id: mockMessageId,
          senderId: mockUserId,
          receiverId: mockFriendId,
          content: 'Hi',
          isRead: true,
          reactions: [],
          replyToMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      messageRepo.findHistory!.mockResolvedValue([mockMessages, 1]);

      const result = await service.getHistory(mockUserId, mockFriendId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(messageRepo.findHistory).toHaveBeenCalledWith(
        mockUserId,
        mockFriendId,
        0,
        20,
      );
    });
  });

  // ── markAsRead ───────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('nên đánh dấu tin nhắn đã đọc và trả về số lượng affected', async () => {
      messageRepo.markAllAsRead!.mockResolvedValue(5);

      const result = await service.markAsRead(mockUserId, mockFriendId);

      expect(result.affected).toBe(5);
      expect(messageRepo.markAllAsRead).toHaveBeenCalledWith(mockFriendId, mockUserId);
    });
  });

  // ── recallMessage ────────────────────────────────────────────────────────

  describe('recallMessage', () => {
    it('nên thu hồi tin nhắn thành công trong vòng 15 phút', async () => {
      const message = {
        id: mockMessageId,
        senderId: mockUserId,
        receiverId: mockFriendId,
        content: 'test',
        createdAt: new Date(), // vừa mới tạo
      } as DirectMessage;

      messageRepo.findById!.mockResolvedValue(message);
      messageRepo.softDelete!.mockResolvedValue(undefined);

      await service.recallMessage(mockUserId, mockMessageId);

      expect(messageRepo.softDelete).toHaveBeenCalledWith(mockMessageId);
      expect(messagesGateway.sendRecalledToUser).toHaveBeenCalledWith(
        mockUserId,
        mockMessageId,
      );
      expect(messagesGateway.sendRecalledToUser).toHaveBeenCalledWith(
        mockFriendId,
        mockMessageId,
      );
    });

    it('nên ném MessageNotFoundException khi tin nhắn không tồn tại', async () => {
      messageRepo.findById!.mockResolvedValue(null);

      await expect(service.recallMessage(mockUserId, mockMessageId)).rejects.toThrow(
        MessageNotFoundException,
      );
    });

    it('nên ném MessageNotFoundException khi người thu hồi không phải người gửi', async () => {
      const message = {
        id: mockMessageId,
        senderId: mockFriendId, // Người khác gửi
        receiverId: mockUserId,
        createdAt: new Date(),
      } as DirectMessage;

      messageRepo.findById!.mockResolvedValue(message);

      await expect(service.recallMessage(mockUserId, mockMessageId)).rejects.toThrow(
        MessageNotFoundException,
      );
    });

    it('nên ném MessageRecallTimeoutException khi tin nhắn đã quá 15 phút', async () => {
      const message = {
        id: mockMessageId,
        senderId: mockUserId,
        receiverId: mockFriendId,
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 phút trước
      } as DirectMessage;

      messageRepo.findById!.mockResolvedValue(message);

      await expect(service.recallMessage(mockUserId, mockMessageId)).rejects.toThrow(
        MessageRecallTimeoutException,
      );
    });
  });

  // ── addReaction ──────────────────────────────────────────────────────────

  describe('addReaction', () => {
    const dto: AddMessageReactionDto = { emoji: ReactionEmoji.LOVE };

    it('nên thả cảm xúc thành công', async () => {
      const message = {
        id: mockMessageId,
        senderId: mockUserId,
        receiverId: mockFriendId,
        reactions: [],
      } as any;

      messageRepo.findById!.mockResolvedValue(message);
      reactionRepo.upsertReaction!.mockResolvedValue({} as any);

      await service.addReaction(mockUserId, mockMessageId, dto);

      expect(reactionRepo.upsertReaction).toHaveBeenCalledWith(
        mockMessageId,
        mockUserId,
        ReactionEmoji.LOVE,
      );
    });

    it('nên ném MessageNotFoundException khi tin nhắn không tồn tại', async () => {
      messageRepo.findById!.mockResolvedValue(null);

      await expect(
        service.addReaction(mockUserId, mockMessageId, dto),
      ).rejects.toThrow(MessageNotFoundException);
    });

    it('nên ném MessageNotFoundException khi user không thuộc cuộc trò chuyện', async () => {
      const message = {
        id: mockMessageId,
        senderId: 'someone-else',
        receiverId: 'another-one',
        reactions: [],
      } as any;

      messageRepo.findById!.mockResolvedValue(message);

      await expect(
        service.addReaction(mockUserId, mockMessageId, dto),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });

  // ── removeReaction ───────────────────────────────────────────────────────

  describe('removeReaction', () => {
    it('nên gỡ cảm xúc thành công', async () => {
      const message = {
        id: mockMessageId,
        senderId: mockUserId,
        receiverId: mockFriendId,
        reactions: [],
      } as any;

      messageRepo.findById!.mockResolvedValue(message);
      reactionRepo.deleteReaction!.mockResolvedValue(true);

      await service.removeReaction(mockUserId, mockMessageId);

      expect(reactionRepo.deleteReaction).toHaveBeenCalledWith(
        mockMessageId,
        mockUserId,
      );
    });

    it('nên ném MessageNotFoundException khi tin nhắn không tồn tại', async () => {
      messageRepo.findById!.mockResolvedValue(null);

      await expect(
        service.removeReaction(mockUserId, mockMessageId),
      ).rejects.toThrow(MessageNotFoundException);
    });
  });
});
