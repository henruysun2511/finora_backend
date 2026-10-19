import { Injectable } from '@nestjs/common';
import { FriendshipRepository } from './repositories/friendship.repository';

@Injectable()
export class FriendsService {
  constructor(private readonly friendshipRepo: FriendshipRepository) {}

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Lấy danh sách UUID bạn bè đã chấp nhận (ACCEPTED) của một user.
   * Dùng cho FeedService dựng bảng tin và gửi thông báo chia sẻ bài đăng.
   */
  async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.friendshipRepo.findAcceptedByUserId(userId);
    return friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }

  /**
   * [CROSS-MODULE] Kiểm tra hai người dùng đã là bạn bè (ACCEPTED) hay chưa.
   * Dùng cho FeedService kiểm tra quyền xem / tương tác với bài đăng.
   */
  async areFriends(userA: string, userB: string): Promise<boolean> {
    return this.friendshipRepo.existsAcceptedBetween(userA, userB);
  }
}