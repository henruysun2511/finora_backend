/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from '../../src/modules/friends/friends.service';
import { FriendshipRepository } from '../../src/modules/friends/repositories/friendship.repository';
import { FriendMapper } from '../../src/modules/friends/mapper/friends.mapper';
import { DataSource } from 'typeorm';
import {
  CannotFriendSelfException,
  FriendRequestAlreadyExistsException,
  AlreadyFriendsException,
  UserBlockedException,
  FriendshipNotFoundException,
} from '../../src/modules/friends/exceptions/friends.exception';
import { FriendshipStatus } from '../../src/modules/friends/enums/friendship-status.enum';
import { FriendRelationStatus } from '../../src/modules/friends/enums/friend-relation-status.enum';
import { PendingRequestType } from '../../src/modules/friends/enums/pending-request-type.enum';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('FriendsService', () => {
  let service: FriendsService;
  let friendshipRepo: any;
  let notificationsService: any;
  let mockUserRepo: any;

  const ME = 'user-me';
  const FRIEND = 'user-friend';
  const OTHER = 'user-other';

  beforeEach(async () => {
    mockUserRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockUserRepo),
    };

    friendshipRepo = {
      findBetweenUsers: jest.fn(),
      findRelationsBetweenUserAndMany: jest.fn().mockResolvedValue([]),
      findFriendsPaged: jest.fn().mockResolvedValue([[], 0]),
      findPendingRequests: jest.fn().mockResolvedValue([]),
      findAcceptedByUserId: jest.fn().mockResolvedValue([]),
      existsAcceptedBetween: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve({ id: 'uuid-1', ...dto })),
      remove: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        FriendMapper,
        { provide: DataSource, useValue: mockDataSource },
        { provide: FriendshipRepository, useValue: friendshipRepo },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers (Anti-N+1 Batch Query)', () => {
    it('Lấy danh sách user và nạp quan hệ trong 1 query duy nhất', async () => {
      mockUserRepo.find.mockResolvedValue([
        { id: FRIEND, fullName: 'Hoàng Văn Minh', email: 'minh@gmail.com', avatar: null },
        { id: OTHER, fullName: 'Trần Văn B', email: 'b@gmail.com', avatar: null },
      ]);

      friendshipRepo.findRelationsBetweenUserAndMany.mockResolvedValue([
        {
          id: 'f-1',
          requesterId: ME,
          addresseeId: FRIEND,
          status: FriendshipStatus.ACCEPTED,
        },
      ]);

      const results = await service.searchUsers(ME, { query: 'minh' });

      expect(mockUserRepo.find).toHaveBeenCalled();
      expect(friendshipRepo.findRelationsBetweenUserAndMany).toHaveBeenCalledWith(ME, [
        FRIEND,
        OTHER,
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].relationStatus).toBe(FriendRelationStatus.ACCEPTED);
      expect(results[1].relationStatus).toBe(FriendRelationStatus.NONE);
    });

    it('Không có user nào khớp -> trả mảng rỗng ngay, không query quan hệ', async () => {
      mockUserRepo.find.mockResolvedValue([]);

      const results = await service.searchUsers(ME, { query: 'khong-ton-tai' });

      expect(results).toEqual([]);
      expect(friendshipRepo.findRelationsBetweenUserAndMany).not.toHaveBeenCalled();
    });
  });

  describe('sendRequest', () => {
    it('Tự kết bạn với chính mình -> ném CannotFriendSelfException', async () => {
      await expect(
        service.sendRequest(ME, 'Tôi', { addresseeId: ME }),
      ).rejects.toThrow(CannotFriendSelfException);
    });

    it('Đã gửi lời mời trước đó (PENDING) -> ném FriendRequestAlreadyExistsException', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue({
        id: 'req-1',
        requesterId: ME,
        addresseeId: FRIEND,
        status: FriendshipStatus.PENDING,
      });

      await expect(
        service.sendRequest(ME, 'Tôi', { addresseeId: FRIEND }),
      ).rejects.toThrow(FriendRequestAlreadyExistsException);
    });

    it('Đã là bạn bè từ trước (ACCEPTED) -> ném AlreadyFriendsException', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue({
        id: 'req-1',
        requesterId: ME,
        addresseeId: FRIEND,
        status: FriendshipStatus.ACCEPTED,
      });

      await expect(
        service.sendRequest(ME, 'Tôi', { addresseeId: FRIEND }),
      ).rejects.toThrow(AlreadyFriendsException);
    });

    it('Quan hệ đã bị chặn (BLOCKED) -> ném UserBlockedException', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue({
        id: 'req-1',
        requesterId: FRIEND,
        addresseeId: ME,
        status: FriendshipStatus.BLOCKED,
      });

      await expect(
        service.sendRequest(ME, 'Tôi', { addresseeId: FRIEND }),
      ).rejects.toThrow(UserBlockedException);
    });

    it('Auto-Accept: B đã gửi cho A trước đó -> Chuyển ACCEPTED và bắn thông báo FRIEND_ACCEPTED', async () => {
      const existing = {
        id: 'req-1',
        requesterId: FRIEND,
        addresseeId: ME,
        status: FriendshipStatus.PENDING,
      };
      friendshipRepo.findBetweenUsers.mockResolvedValue(existing);

      const result = await service.sendRequest(ME, 'Tôi', { addresseeId: FRIEND });

      expect(result.status).toBe(FriendshipStatus.ACCEPTED);
      expect(result.respondedAt).toBeInstanceOf(Date);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FRIEND,
          type: NotificationType.FRIEND_ACCEPTED,
        }),
      );
    });

    it('Gửi lời mời kết bạn mới thành công -> Tạo PENDING và bắn thông báo FRIEND_REQUEST', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue(null);

      const result = await service.sendRequest(ME, 'Tôi', { addresseeId: FRIEND });

      expect(result.status).toBe(FriendshipStatus.PENDING);
      expect(result.requesterId).toBe(ME);
      expect(result.addresseeId).toBe(FRIEND);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FRIEND,
          type: NotificationType.FRIEND_REQUEST,
        }),
      );
    });
  });

  describe('getPendingRequests', () => {
    it('Lấy danh sách lời mời nhận được (received)', async () => {
      friendshipRepo.findPendingRequests.mockResolvedValue([
        {
          id: 'req-1',
          requesterId: FRIEND,
          addresseeId: ME,
          requester: { id: FRIEND, fullName: 'Minh', email: 'm@gmail.com', avatar: null },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getPendingRequests(ME, { type: undefined as any });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('received');
      expect(result[0].user.fullName).toBe('Minh');
    });
  });

  describe('acceptRequest', () => {
    it('Không tìm thấy lời mời -> ném FriendshipNotFoundException', async () => {
      friendshipRepo.findById.mockResolvedValue(null);

      await expect(service.acceptRequest(ME, 'Tôi', 'req-999')).rejects.toThrow(
        FriendshipNotFoundException,
      );
    });

    it('Người ngoài không phải người nhận -> ném ForbiddenException', async () => {
      friendshipRepo.findById.mockResolvedValue({
        id: 'req-1',
        requesterId: FRIEND,
        addresseeId: OTHER, // Người nhận là OTHER, không phải ME
        status: FriendshipStatus.PENDING,
      });

      await expect(service.acceptRequest(ME, 'Tôi', 'req-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Chấp nhận lời mời thành công -> Cập nhật ACCEPTED và bắn thông báo FRIEND_ACCEPTED', async () => {
      const friendship = {
        id: 'req-1',
        requesterId: FRIEND,
        addresseeId: ME,
        status: FriendshipStatus.PENDING,
      };
      friendshipRepo.findById.mockResolvedValue(friendship);

      const result = await service.acceptRequest(ME, 'Tôi', 'req-1');

      expect(result.status).toBe(FriendshipStatus.ACCEPTED);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FRIEND,
          type: NotificationType.FRIEND_ACCEPTED,
        }),
      );
    });
  });

  describe('rejectRequest', () => {
    it('Từ chối lời mời kết bạn thành công', async () => {
      const friendship = {
        id: 'req-1',
        requesterId: FRIEND,
        addresseeId: ME,
        status: FriendshipStatus.PENDING,
      };
      friendshipRepo.findById.mockResolvedValue(friendship);

      const result = await service.rejectRequest(ME, 'req-1');

      expect(result.status).toBe(FriendshipStatus.REJECTED);
    });
  });

  describe('getFriends (Pagination)', () => {
    it('Lấy danh sách bạn bè phân trang thành công', async () => {
      friendshipRepo.findFriendsPaged.mockResolvedValue([
        [
          {
            id: 'f-1',
            requesterId: ME,
            addresseeId: FRIEND,
            addressee: { id: FRIEND, fullName: 'Minh', email: 'm@gmail.com', avatar: null },
            updatedAt: new Date(),
          },
        ],
        1,
      ]);

      const result = await service.getFriends(ME, { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('Minh');
    });
  });

  describe('unfriend', () => {
    it('Chưa là bạn bè -> ném FriendshipNotFoundException', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue(null);

      await expect(service.unfriend(ME, FRIEND)).rejects.toThrow(
        FriendshipNotFoundException,
      );
    });

    it('Hủy kết bạn thành công', async () => {
      const friendship = { id: 'f-1', status: FriendshipStatus.ACCEPTED };
      friendshipRepo.findBetweenUsers.mockResolvedValue(friendship);

      const result = await service.unfriend(ME, FRIEND);

      expect(friendshipRepo.remove).toHaveBeenCalledWith(friendship);
      expect(result).toEqual({ success: true });
    });
  });

  describe('blockUser', () => {
    it('Tự chặn chính mình -> ném BadRequestException', async () => {
      await expect(service.blockUser(ME, ME)).rejects.toThrow(BadRequestException);
    });

    it('Chặn người dùng thành công', async () => {
      friendshipRepo.findBetweenUsers.mockResolvedValue(null);

      const result = await service.blockUser(ME, FRIEND);

      expect(result.status).toBe(FriendshipStatus.BLOCKED);
    });
  });

  describe('Cross-module methods', () => {
    it('getAcceptedFriendIds: Lấy danh sách ID bạn bè chuẩn', async () => {
      friendshipRepo.findAcceptedByUserId.mockResolvedValue([
        { requesterId: ME, addresseeId: FRIEND },
        { requesterId: OTHER, addresseeId: ME },
      ]);

      const friendIds = await service.getAcceptedFriendIds(ME);

      expect(friendIds).toEqual([FRIEND, OTHER]);
    });

    it('areFriends: Kiểm tra quan hệ bạn bè', async () => {
      friendshipRepo.existsAcceptedBetween.mockResolvedValue(true);

      const isFriend = await service.areFriends(ME, FRIEND);

      expect(isFriend).toBe(true);
    });
  });
});