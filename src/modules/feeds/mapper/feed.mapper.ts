import { Injectable } from '@nestjs/common';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { PostReaction } from '../entities/post-reaction.entity';
import { ReactionEmoji } from '../../../common/enums/reaction-emoji.enum';
import {
  FeedPostResponseDto,
  UpdateFeedPostResponseDto,
} from '../dto/response/feed-post-response.dto';
import { PostReactionResponseDto } from '../dto/response/post-reaction-response.dto';
import { FEED_CONSTANTS } from '../feed.constant';

@Injectable()
export class FeedMapper {
  /**
   * Chuyển giao dịch thành bài đăng Bảng tin.
   * Ẩn số tiền (amount = null) khi tác giả bật amountHidden và người xem không phải tác giả.
   * Cờ isAmountHidden luôn phản ánh trạng thái công tắc để tác giả còn hiển thị đúng nút bật/tắt.
   */
  toFeedPost(
    post: Transaction,
    reactions: PostReaction[],
    currentUserId: string,
  ): FeedPostResponseDto {
    const hideAmount = post.amountHidden && post.createdBy !== currentUserId;
    const myReaction = reactions.find((r) => r.userId === currentUserId);

    return {
      id: post.id,
      author: {
        id: post.createdBy,
        fullName: post.creator?.fullName ?? '',
        username: post.creator?.username ?? '',
        avatar: post.creator?.avatar ?? null,
      },
      name: post.name,
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            icon: post.category.icon ?? null,
            color: post.category.color ?? null,
          }
        : null,
      amount: hideAmount ? null : post.amount,
      currency: post.currency,
      isAmountHidden: post.amountHidden,
      note: post.note ?? null,
      photoUrl: post.photoUrl ?? null,
      photoType: post.photoType ?? null,
      locationName: post.locationName ?? null,
      transactionDate: post.transactionDate,
      reactionsCount: reactions.length,
      topReactions: this.getTopReactions(reactions),
      myReaction: myReaction?.emoji ?? null,
    };
  }

  toReactionResponse(reaction: PostReaction): PostReactionResponseDto {
    return {
      userId: reaction.userId,
      fullName: reaction.user?.fullName ?? '',
      avatar: reaction.user?.avatar ?? null,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    };
  }

  toUpdateResponse(post: Transaction): UpdateFeedPostResponseDto {
    return {
      id: post.id,
      visibility: post.visibility,
      amountHidden: post.amountHidden,
      note: post.note ?? null,
      updatedAt: post.updatedAt,
    };
  }

  /** Các emoji phổ biến nhất (nhiều lượt thả nhất trước), tối đa TOP_REACTIONS_LIMIT. */
  private getTopReactions(reactions: PostReaction[]): ReactionEmoji[] {
    const counts = new Map<ReactionEmoji, number>();
    for (const r of reactions) {
      counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, FEED_CONSTANTS.TOP_REACTIONS_LIMIT)
      .map(([emoji]) => emoji);
  }
}