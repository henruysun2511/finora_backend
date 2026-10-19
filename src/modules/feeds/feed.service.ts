import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostReactionRepository } from './repositories/post-reaction.repository';
import { FeedMapper } from './mapper/feed.mapper';
import { Transaction } from '../transactions/entities/transaction.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { FeedQueryDto } from './dto/request/feed-query.dto';
import { UpdateFeedPostDto } from './dto/request/update-feed-post.dto';
import { FeedPostResponseDto, UpdateFeedPostResponseDto } from './dto/response/feed-post-response.dto';
import {
  AddReactionResponseDto,
  PostReactionResponseDto,
  RemoveReactionResponseDto,
} from './dto/response/post-reaction-response.dto';
import { CreateNotificationDto } from '../notifications/dto/request/create-notification.dto';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { PaginatedResponse } from '../../common/response/api-response';
import { ReactionEmoji } from '../../common/enums/reaction-emoji.enum';
import { TransactionVisibility } from '../../common/enums/transaction-visibility.enum';
import {
  TransactionAccessDeniedException,
  TransactionNotFoundException,
} from '../transactions/exceptions/transaction.exception';
import {
  NotFriendException,
  PostAccessDeniedException,
  PostNotFoundException,
  ReactionNotFoundException,
} from './exceptions/feed.exception';
import { FEED_CONSTANTS } from './feed.constant';

@Injectable()
export class FeedService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
    private readonly reactionRepo: PostReactionRepository,
    private readonly mapper: FeedMapper,
  ) {}

  // ── LIST ─────────────────────────────────────────────────────────────────

  /**
   * Lấy bảng tin: bài đăng FRIENDS của bạn bè (ACCEPTED) và của chính người xem,
   * mới nhất trước, có phân trang. Số tiền được ẩn theo cờ amountHidden của tác giả.
   */
  async getFeed(
    userId: string,
    query: FeedQueryDto,
  ): Promise<PaginatedResponse<FeedPostResponseDto>> {
    const friendIds = await this.friendsService.getAcceptedFriendIds(userId);

    if (query.friendId && query.friendId !== userId && !friendIds.includes(query.friendId)) {
      throw new NotFriendException();
    }

    const authorIds = query.friendId ? [query.friendId] : [...friendIds, userId];

    const [posts, total] = await this.transactionsService.findFriendsFeed(
      authorIds,
      query.page,
      query.limit,
    );

    const reactions = await this.reactionRepo.findByPostIds(posts.map((p) => p.id));
    const reactionsByPost = this.groupByPost(reactions);

    const items = posts.map((post) =>
      this.mapper.toFeedPost(post, reactionsByPost.get(post.id) ?? [], userId),
    );

    return PaginatedResponse.of(items, total, query.page, query.limit);
  }

  // ── REACTIONS ────────────────────────────────────────────────────────────

  /**
   * Thả cảm xúc vào bài đăng; nếu đã thả trước đó thì đổi sang emoji mới.
   * Gửi thông báo POST_REACTED cho tác giả (trừ khi tự thả vào bài của mình).
   */
  async addReaction(
    userId: string,
    userFullName: string,
    transactionId: string,
    emoji: ReactionEmoji,
  ): Promise<AddReactionResponseDto> {
    const post = await this.getAccessiblePost(userId, transactionId);

    const existing = await this.reactionRepo.findByPostAndUser(transactionId, userId);
    if (existing) {
      existing.emoji = emoji;
      await this.reactionRepo.save(existing);
    } else {
      await this.reactionRepo.save(
        this.reactionRepo.create({ transactionId, userId, emoji }),
      );
    }

    if (post.createdBy !== userId) {
      await this.sendNotifications([
        {
          userId: post.createdBy,
          type: NotificationType.POST_REACTED,
          title: `${userFullName} đã bày tỏ cảm xúc về bài đăng của bạn`,
          body: `Bài đăng: ${post.name}`,
          relatedEntityType: FEED_CONSTANTS.POST_ENTITY_TYPE,
          relatedEntityId: post.id,
        },
      ]);
    }

    return { success: true, emoji };
  }

  /** Gỡ bỏ cảm xúc đã thả trước đó trên bài đăng. */
  async removeReaction(
    userId: string,
    transactionId: string,
  ): Promise<RemoveReactionResponseDto> {
    const reaction = await this.reactionRepo.findByPostAndUser(transactionId, userId);
    if (!reaction) throw new ReactionNotFoundException();

    await this.reactionRepo.remove(reaction.id);

    return { success: true, message: 'Đã gỡ bỏ cảm xúc' };
  }

  /**
   * Danh sách người đã thả cảm xúc vào bài đăng (ai thả emoji nào).
   * Chỉ tác giả và bạn bè của tác giả mới xem được.
   */
  async getReactions(
    userId: string,
    transactionId: string,
  ): Promise<PostReactionResponseDto[]> {
    await this.getAccessiblePost(userId, transactionId);

    const reactions = await this.reactionRepo.findReactionsByPostId(transactionId);
    return reactions.map((r) => this.mapper.toReactionResponse(r));
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────

  /**
   * Chỉnh sửa bài đăng (chỉ tác giả): visibility, amountHidden, note trong 1 request.
   * Khi chuyển PRIVATE → FRIENDS, gửi thông báo FRIEND_TRANSACTION_POSTED cho bạn bè.
   */
  async updatePost(
    userId: string,
    userFullName: string,
    transactionId: string,
    dto: UpdateFeedPostDto,
  ): Promise<UpdateFeedPostResponseDto> {
    const transaction = await this.transactionsService.findEntityById(transactionId);
    if (!transaction) throw new TransactionNotFoundException(transactionId);

    if (transaction.createdBy !== userId) {
      throw new TransactionAccessDeniedException('Bạn không có quyền chỉnh sửa bài đăng này');
    }

    const wasPrivate = transaction.visibility === TransactionVisibility.PRIVATE;

    if (dto.visibility !== undefined) transaction.visibility = dto.visibility;
    if (dto.amountHidden !== undefined) transaction.amountHidden = dto.amountHidden;
    if (dto.note !== undefined) transaction.note = dto.note;

    const saved = await this.transactionsService.saveEntity(transaction);

    if (wasPrivate && saved.visibility === TransactionVisibility.FRIENDS) {
      const friendIds = await this.friendsService.getAcceptedFriendIds(userId);
      await this.sendNotifications(
        friendIds.map((friendId) => ({
          userId: friendId,
          type: NotificationType.FRIEND_TRANSACTION_POSTED,
          title: `${userFullName} vừa chia sẻ một khoảnh khắc`,
          body: saved.name,
          relatedEntityType: FEED_CONSTANTS.POST_ENTITY_TYPE,
          relatedEntityId: saved.id,
        })),
      );
    }

    return this.mapper.toUpdateResponse(saved);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Bài đăng phải tồn tại và đang được chia sẻ (FRIENDS); người gọi phải là tác giả
   * hoặc bạn bè (ACCEPTED) của tác giả.
   */
  private async getAccessiblePost(userId: string, transactionId: string): Promise<Transaction> {
    const post = await this.transactionsService.findEntityById(transactionId);
    if (!post || post.visibility !== TransactionVisibility.FRIENDS) {
      throw new PostNotFoundException();
    }

    if (post.createdBy !== userId) {
      const isFriend = await this.friendsService.areFriends(userId, post.createdBy);
      if (!isFriend) throw new PostAccessDeniedException();
    }

    return post;
  }

  private groupByPost(reactions: PostReaction[]): Map<string, PostReaction[]> {
    const map = new Map<string, PostReaction[]>();
    for (const reaction of reactions) {
      const list = map.get(reaction.transactionId);
      if (list) list.push(reaction);
      else map.set(reaction.transactionId, [reaction]);
    }
    return map;
  }

  /** Thông báo là tác vụ phụ: lỗi gửi thông báo không được làm hỏng thao tác chính đã lưu. */
  private async sendNotifications(notifications: CreateNotificationDto[]): Promise<void> {
    await Promise.allSettled(
      notifications.map((n) => this.notificationsService.createNotification(n)),
    );
  }
}