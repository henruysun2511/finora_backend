/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from '../../src/modules/friends/friends.service';
import { FriendshipRepository } from '../../src/modules/friends/repository/friends.repository';
import { FriendMapper } from '../../src/modules/friends/mapper/friends.mapper';
import { DataSource } from 'typeorm';
import { 
  CannotFriendSelfException, 
  FriendRequestAlreadyExistsException 
} from '../../src/modules/friends/exceptions/friends.exception';
import { FriendshipStatus } from '../../src/modules/friends/enums/friendship-status.enum';

describe('FriendsService', () => {
  let service: FriendsService;
  let friendshipRepo: Partial<FriendshipRepository>;

  const mockDataSource = {};
  const mockFriendMapper = {};

  beforeEach(async () => {
    friendshipRepo = {
      findBetweenUsers: jest.fn(),
      create: jest.fn((dto) => dto as any),
      save: jest.fn((dto) => Promise.resolve({ id: 'uuid-1', ...dto } as any)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: FriendshipRepository, useValue: friendshipRepo },
        { provide: FriendMapper, useValue: mockFriendMapper },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendRequest (Edge Cases & Happy Paths)', () => {
    // 1. Edge Case: Tự kết bạn với chính mình
    it('should throw CannotFriendSelfException when trying to add self', async () => {
      const userId = 'user-1';
      await expect(
        service.sendRequest(userId, { addresseeId: userId }),
      ).rejects.toThrow(CannotFriendSelfException);
    });

    // 2. Edge Case: Đã gửi lời mời trước đó (Trùng lặp / Anti-Spam)
    it('should throw FriendRequestAlreadyExistsException if request already sent', async () => {
      const requesterId = 'user-1';
      const addresseeId = 'user-2';

      jest.spyOn(friendshipRepo, 'findBetweenUsers').mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      } as any);

      await expect(
        service.sendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(FriendRequestAlreadyExistsException);
    });

    // 3. Happy Path: Gửi lời mời kết bạn mới thành công
    it('should successfully send a new friend request', async () => {
      const requesterId = 'user-1';
      const addresseeId = 'user-2';

      jest.spyOn(friendshipRepo, 'findBetweenUsers').mockResolvedValue(null);

      const result = await service.sendRequest(requesterId, { addresseeId });
      expect(result).toBeDefined();
      expect(result.status).toEqual(FriendshipStatus.PENDING);
      expect(result.requesterId).toEqual(requesterId);
      expect(result.addresseeId).toEqual(addresseeId);
    });
  });
});