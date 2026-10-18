import { FeedService } from '../../src/modules/feed/feed.service';
import { FeedMapper } from '../../src/modules/feed/mapper/feed.mapper';
import {
  NotFriendException,
  PostAccessDeniedException,
  PostNotFoundException,
  ReactionNotFoundException,
} from '../../src/modules/feed/exceptions/feed.exception';
import {
  TransactionAccessDeniedException,
  TransactionNotFoundException,
} from '../../src/modules/transactions/exceptions/transaction.exception';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { ReactionEmoji } from '../../src/common/enums/reaction-emoji.enum';
import { TransactionVisibility } from '../../src/common/enums/transaction-visibility.enum';

describe('FeedService', () => {
  let service: FeedService;
  let transactionsService: any;
  let friendsService: any;
  let notificationsService: any;
  let reactionRepo: any;

  const ME = 'u-me';
  const FRIEND = 'u-friend';
  const STRANGER = 'u-stranger';
  const POST_ID = 'tx-1';

  const makePost = (overrides: Record<string, any> = {}) => ({
    id: POST_ID,
    createdBy: FRIEND,
    name: 'Cà phê sáng',
    currency: 'VND',
    amount: 50000,
    amountHidden: false,
    visibility: TransactionVisibility.FRIENDS,
    note: 'vui quá',
    photoUrl: null,
    photoType: null,
    locationName: null,
    transactionDate: new Date('2026-10-18T08:30:00.000Z'),
    updatedAt: new Date('2026-10-18T18:35:00.000Z'),
    creator: { id: FRIEND, fullName: 'Hoàng Văn Minh', username: 'minh', avatar: 'a.jpg' },
    category: { id: 'c-1', name: 'Cà phê', icon: 'coffee', color: '#8B5A2B' },
    ...overrides,
  });

  beforeEach(() => {
    transactionsService = {
      findFriendsFeed: jest.fn(),
      findEntityById: jest.fn(),
      saveEntity: jest.fn(async (t) => t),
    };
    friendsService = {
      getAcceptedFriendIds: jest.fn().mockResolvedValue([FRIEND]),
      areFriends: jest.fn().mockResolvedValue(true),
    };
    notificationsService = { createNotification: jest.fn().mockResolvedValue({}) };
    reactionRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (r) => r),
      findByPostAndUser: jest.fn(),
      findReactionsByPostId: jest.fn(),
      findByPostIds: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
    };

    service = new FeedService(
      transactionsService,
      friendsService,
      notificationsService,
      reactionRepo,
      new FeedMapper(),
    );
  });

  describe('getFeed', () => {
    it('Lấy bài của bạn bè + chính mình, ẩn số tiền với người xem không phải tác giả', async () => {
      transactionsService.findFriendsFeed.mockResolvedValue([
        [
          makePost({ amountHidden: true }),
          makePost({ id: 'tx-2', createdBy: ME, amountHidden: true }),
        ],
        2,
      ]);
      reactionRepo.findByPostIds.mockResolvedValue([
        { transactionId: POST_ID, userId: ME, emoji: ReactionEmoji.LOVE },
        { transactionId: POST_ID, userId: 'u-x', emoji: ReactionEmoji.LIKE },
        { transactionId: POST_ID, userId: 'u-y', emoji: ReactionEmoji.LIKE },
      ]);

      const result = await service.getFeed(ME, { page: 1, limit: 10 });

      expect(transactionsService.findFriendsFeed).toHaveBeenCalledWith([FRIEND, ME], 1, 10);
      expect(result.pagination.total).toBe(2);
      expect(result.items[0].amount).toBeNull();
      expect(result.items[0].isAmountHidden).toBe(true);
      expect(result.items[0].reactionsCount).toBe(3);
      expect(result.items[0].topReactions).toEqual([ReactionEmoji.LIKE, ReactionEmoji.LOVE]);
      expect(result.items[0].myReaction).toBe(ReactionEmoji.LOVE);
      expect(result.items[1].amount).toBe(50000);
      expect(result.items[1].myReaction).toBeNull();
    });

    it('Lọc theo friendId hợp lệ chỉ lấy bài của người đó', async () => {
      transactionsService.findFriendsFeed.mockResolvedValue([[], 0]);

      await service.getFeed(ME, { page: 1, limit: 10, friendId: FRIEND });

      expect(transactionsService.findFriendsFeed).toHaveBeenCalledWith([FRIEND], 1, 10);
    });

    it('Lọc theo người lạ → NotFriendException', async () => {
      await expect(
        service.getFeed(ME, { page: 1, limit: 10, friendId: STRANGER }),
      ).rejects.toBeInstanceOf(NotFriendException);
    });
  });

  describe('addReaction', () => {
    it('Bài không tồn tại hoặc PRIVATE → PostNotFoundException', async () => {
      transactionsService.findEntityById.mockResolvedValue(null);
      await expect(
        service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LOVE),
      ).rejects.toBeInstanceOf(PostNotFoundException);

      transactionsService.findEntityById.mockResolvedValue(
        makePost({ visibility: TransactionVisibility.PRIVATE }),
      );
      await expect(
        service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LOVE),
      ).rejects.toBeInstanceOf(PostNotFoundException);
    });

    it('Chưa kết bạn với tác giả → PostAccessDeniedException', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      friendsService.areFriends.mockResolvedValue(false);

      await expect(
        service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LOVE),
      ).rejects.toBeInstanceOf(PostAccessDeniedException);
    });

    it('Thả mới: tạo reaction và gửi thông báo POST_REACTED cho tác giả', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      reactionRepo.findByPostAndUser.mockResolvedValue(null);

      const result = await service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LOVE);

      expect(result).toEqual({ success: true, emoji: ReactionEmoji.LOVE });
      expect(reactionRepo.create).toHaveBeenCalledWith({
        transactionId: POST_ID,
        userId: ME,
        emoji: ReactionEmoji.LOVE,
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FRIEND,
          type: NotificationType.POST_REACTED,
          title: 'Tôi đã bày tỏ cảm xúc về bài đăng của bạn',
          relatedEntityType: 'POST',
          relatedEntityId: POST_ID,
        }),
      );
    });

    it('Đã thả trước đó: đổi sang emoji mới, không tạo bản ghi mới', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      const existing = { id: 'r-1', emoji: ReactionEmoji.LIKE };
      reactionRepo.findByPostAndUser.mockResolvedValue(existing);

      await service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.WOW);

      expect(existing.emoji).toBe(ReactionEmoji.WOW);
      expect(reactionRepo.create).not.toHaveBeenCalled();
      expect(reactionRepo.save).toHaveBeenCalledWith(existing);
    });

    it('Tự thả vào bài của mình: không gửi thông báo', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost({ createdBy: ME }));
      reactionRepo.findByPostAndUser.mockResolvedValue(null);

      await service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LIKE);

      expect(friendsService.areFriends).not.toHaveBeenCalled();
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('Lỗi gửi thông báo không làm hỏng thao tác thả reaction', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      reactionRepo.findByPostAndUser.mockResolvedValue(null);
      notificationsService.createNotification.mockRejectedValue(new Error('socket down'));

      await expect(
        service.addReaction(ME, 'Tôi', POST_ID, ReactionEmoji.LIKE),
      ).resolves.toEqual({ success: true, emoji: ReactionEmoji.LIKE });
    });
  });

  describe('removeReaction', () => {
    it('Chưa từng thả → ReactionNotFoundException', async () => {
      reactionRepo.findByPostAndUser.mockResolvedValue(null);
      await expect(service.removeReaction(ME, POST_ID)).rejects.toBeInstanceOf(
        ReactionNotFoundException,
      );
    });

    it('Gỡ reaction thành công', async () => {
      reactionRepo.findByPostAndUser.mockResolvedValue({ id: 'r-1' });

      const result = await service.removeReaction(ME, POST_ID);

      expect(reactionRepo.remove).toHaveBeenCalledWith('r-1');
      expect(result).toEqual({ success: true, message: 'Đã gỡ bỏ cảm xúc' });
    });
  });

  describe('getReactions', () => {
    it('Trả danh sách người đã thả cảm xúc', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      const createdAt = new Date('2026-10-18T09:00:00.000Z');
      reactionRepo.findReactionsByPostId.mockResolvedValue([
        {
          userId: 'u-an',
          emoji: ReactionEmoji.LOVE,
          createdAt,
          user: { fullName: 'Nguyễn Thị An', avatar: 'an.jpg' },
        },
      ]);

      const result = await service.getReactions(ME, POST_ID);

      expect(result).toEqual([
        {
          userId: 'u-an',
          fullName: 'Nguyễn Thị An',
          avatar: 'an.jpg',
          emoji: ReactionEmoji.LOVE,
          createdAt,
        },
      ]);
    });

    it('Người lạ không xem được → PostAccessDeniedException', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost());
      friendsService.areFriends.mockResolvedValue(false);

      await expect(service.getReactions(STRANGER, POST_ID)).rejects.toBeInstanceOf(
        PostAccessDeniedException,
      );
    });
  });

  describe('updatePost', () => {
    it('Không tìm thấy giao dịch → TransactionNotFoundException', async () => {
      transactionsService.findEntityById.mockResolvedValue(null);
      await expect(service.updatePost(ME, 'Tôi', POST_ID, {})).rejects.toBeInstanceOf(
        TransactionNotFoundException,
      );
    });

    it('Không phải tác giả → TransactionAccessDeniedException (403)', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost({ createdBy: FRIEND }));
      await expect(service.updatePost(ME, 'Tôi', POST_ID, { note: 'x' })).rejects.toBeInstanceOf(
        TransactionAccessDeniedException,
      );
      expect(transactionsService.saveEntity).not.toHaveBeenCalled();
    });

    it('Chỉ cập nhật các trường được gửi lên', async () => {
      transactionsService.findEntityById.mockResolvedValue(
        makePost({ createdBy: ME, note: 'cũ', amountHidden: false }),
      );

      const result = await service.updatePost(ME, 'Tôi', POST_ID, { amountHidden: true });

      expect(result.amountHidden).toBe(true);
      expect(result.note).toBe('cũ');
      expect(result.visibility).toBe(TransactionVisibility.FRIENDS);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('PRIVATE → FRIENDS: gửi FRIEND_TRANSACTION_POSTED cho từng người bạn', async () => {
      friendsService.getAcceptedFriendIds.mockResolvedValue([FRIEND, 'u-friend-2']);
      transactionsService.findEntityById.mockResolvedValue(
        makePost({ createdBy: ME, visibility: TransactionVisibility.PRIVATE }),
      );

      await service.updatePost(ME, 'Tôi', POST_ID, {
        visibility: TransactionVisibility.FRIENDS,
        note: 'caption mới',
      });

      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FRIEND,
          type: NotificationType.FRIEND_TRANSACTION_POSTED,
          relatedEntityType: 'POST',
          relatedEntityId: POST_ID,
        }),
      );
    });

    it('FRIENDS → PRIVATE: gỡ khỏi Bảng tin, không gửi thông báo', async () => {
      transactionsService.findEntityById.mockResolvedValue(makePost({ createdBy: ME }));

      const result = await service.updatePost(ME, 'Tôi', POST_ID, {
        visibility: TransactionVisibility.PRIVATE,
      });

      expect(result.visibility).toBe(TransactionVisibility.PRIVATE);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });
  });
});