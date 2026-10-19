import { FeedController } from '../../src/modules/feeds/feed.controller';
import { ReactionEmoji } from '../../src/common/enums/reaction-emoji.enum';
import { TransactionVisibility } from '../../src/common/enums/transaction-visibility.enum';

describe('FeedController', () => {
  let controller: FeedController;
  let feedService: any;

  const USER_ID = 'u-me';
  const FULL_NAME = 'Tôi';
  const POST_ID = 'tx-1';

  beforeEach(() => {
    feedService = {
      getFeed: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      getReactions: jest.fn(),
      updatePost: jest.fn(),
    };
    controller = new FeedController(feedService);
  });

  it('getFeed: trả nguyên kết quả phân trang từ service', async () => {
    const page = { items: [], pagination: { page: 1, limit: 10, total: 0 } };
    feedService.getFeed.mockResolvedValue(page);
    const query = { page: 1, limit: 10 };

    const result = await controller.getFeed(USER_ID, query);

    expect(feedService.getFeed).toHaveBeenCalledWith(USER_ID, query);
    expect(result).toBe(page);
  });

  it('addReaction: bọc kết quả bằng ApiResponse', async () => {
    feedService.addReaction.mockResolvedValue({ success: true, emoji: ReactionEmoji.LOVE });

    const result = await controller.addReaction(USER_ID, FULL_NAME, POST_ID, {
      emoji: ReactionEmoji.LOVE,
    });

    expect(feedService.addReaction).toHaveBeenCalledWith(
      USER_ID,
      FULL_NAME,
      POST_ID,
      ReactionEmoji.LOVE,
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ success: true, emoji: ReactionEmoji.LOVE });
  });

  it('removeReaction: trả message gỡ bỏ cảm xúc', async () => {
    feedService.removeReaction.mockResolvedValue({ success: true, message: 'Đã gỡ bỏ cảm xúc' });

    const result = await controller.removeReaction(USER_ID, POST_ID);

    expect(feedService.removeReaction).toHaveBeenCalledWith(USER_ID, POST_ID);
    expect(result.message).toBe('Đã gỡ bỏ cảm xúc');
  });

  it('getReactions: trả danh sách người thả cảm xúc', async () => {
    feedService.getReactions.mockResolvedValue([{ userId: 'u-an' }]);

    const result = await controller.getReactions(USER_ID, POST_ID);

    expect(feedService.getReactions).toHaveBeenCalledWith(USER_ID, POST_ID);
    expect(result.data).toEqual([{ userId: 'u-an' }]);
  });

  it('updatePost: chuyển dto và thông tin người dùng cho service', async () => {
    const dto = { visibility: TransactionVisibility.FRIENDS, amountHidden: true };
    feedService.updatePost.mockResolvedValue({ id: POST_ID, ...dto });

    const result = await controller.updatePost(USER_ID, FULL_NAME, POST_ID, dto);

    expect(feedService.updatePost).toHaveBeenCalledWith(USER_ID, FULL_NAME, POST_ID, dto);
    expect(result.data).toEqual({ id: POST_ID, ...dto });
  });
});