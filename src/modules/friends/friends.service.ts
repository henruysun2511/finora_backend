import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, ILike, Not } from 'typeorm';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendMapper } from './mapper/friends.mapper';
import { FriendshipStatus } from './enums/friendship-status.enum';
import { SendFriendRequestDto } from './dto/request/send-friend-request.dto';
import { FriendQueryDto } from './dto/request/friend-query.dto';
import { SearchUserQueryDto } from './dto/request/search-user-query.dto';
import {
  PendingRequestQueryDto,
} from './dto/request/pending-request-query.dto';
import { PendingRequestType } from './enums/pending-request-type.enum';
import { FriendRelationStatus } from './enums/friend-relation-status.enum';
import { FriendResponseDto } from './dto/response/friend-response.dto';
import { PendingFriendRequestResponseDto } from './dto/response/pending-request-response.dto';
import { SearchUserResultDto } from './dto/response/search-user-response.dto';
import { FriendshipStatusResponseDto } from './dto/response/friend-status-response.dto';
import {
  CannotFriendSelfException,
  FriendRequestAlreadyExistsException,
  AlreadyFriendsException,
  UserBlockedException,
  FriendshipNotFoundException,
} from './exceptions/friends.exception';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { CreateNotificationDto } from '../notifications/dto/request/create-notification.dto';

@Injectable()
export class FriendsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly friendshipRepo: FriendshipRepository,
    private readonly friendMapper: FriendMapper,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── 1. TÌM KIẾM NGƯỜI DÙNG ─────────────────────────────────────────────────

  /**
   * Tìm kiếm người dùng theo từ khóa và xác định trạng thái quan hệ với người tìm kiếm.
   * [TỐI ƯU HÓA]: Gom quan hệ của toàn bộ danh sách tìm thấy trong 1 query duy nhất (khử N+1).
   */
  async searchUsers(
    currentUserId: string,
    queryDto: SearchUserQueryDto,
  ): Promise<SearchUserResultDto[]> {
    const keyword = queryDto.query ? `%${queryDto.query}%` : '%';

    const userRepository = this.dataSource.getRepository(User);
    const users = await userRepository.find({
      where: [
        { fullName: ILike(keyword), id: Not(currentUserId) },
        { email: ILike(keyword), id: Not(currentUserId) },
      ],
      take: 20,
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.id);
    const relations = await this.friendshipRepo.findRelationsBetweenUserAndMany(
      currentUserId,
      userIds,
    );

    // Lập bản đồ tra cứu quan hệ theo targetUserId (O(1) lookup)
    const relationMap = new Map<string, (typeof relations)[0]>();
    for (const rel of relations) {
      const otherUserId = rel.requesterId === currentUserId ? rel.addresseeId : rel.requesterId;
      relationMap.set(otherUserId, rel);
    }

    return users.map((user) => {
      const relation = relationMap.get(user.id);
      let relationStatus = FriendRelationStatus.NONE;

      if (relation) {
        if (relation.status === FriendshipStatus.ACCEPTED) {
          relationStatus = FriendRelationStatus.ACCEPTED;
        } else if (relation.status === FriendshipStatus.PENDING) {
          relationStatus =
            relation.requesterId === currentUserId
              ? FriendRelationStatus.PENDING_SENT
              : FriendRelationStatus.PENDING_RECEIVED;
        } else if (relation.status === FriendshipStatus.BLOCKED) {
          relationStatus = FriendRelationStatus.BLOCKED;
        }
      }

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar ?? null,
        relationStatus,
      };
    });
  }

  // ── 2. GỬI LỜI MỜI KẾT BẠN ────────────────────────────────────────────────

  /**
   * Gửi lời mời kết bạn.
   * Xử lý Auto-Accept nếu người kia đã gửi lời mời trước đó.
   * Gửi thông báo realtime (FRIEND_REQUEST hoặc FRIEND_ACCEPTED).
   */
  async sendRequest(
    requesterId: string,
    requesterFullName: string,
    dto: SendFriendRequestDto,
  ) {
    const addresseeId = dto.addresseeId;
    if (requesterId === addresseeId) {
      throw new CannotFriendSelfException();
    }

    const existing = await this.friendshipRepo.findBetweenUsers(requesterId, addresseeId);

    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new UserBlockedException();
      }
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new AlreadyFriendsException();
      }
      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requesterId === requesterId) {
          throw new FriendRequestAlreadyExistsException();
        } else {
          // B đã gửi cho A trước đó, giờ A gửi lại -> Auto-Accept
          existing.status = FriendshipStatus.ACCEPTED;
          existing.respondedAt = new Date();
          const saved = await this.friendshipRepo.save(existing);

          // Bắn thông báo kết bạn thành công cho người gửi ban đầu
          await this.sendNotificationSafe({
            userId: existing.requesterId,
            type: NotificationType.FRIEND_ACCEPTED,
            title: `${requesterFullName} đã chấp nhận lời mời kết bạn`,
            body: 'Hai bạn đã chính thức trở thành bạn bè trên FINORA',
            relatedEntityType: 'FRIENDSHIP',
            relatedEntityId: saved.id,
          });

          return saved;
        }
      }
    }

    const friendship = this.friendshipRepo.create({
      requesterId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });
    const saved = await this.friendshipRepo.save(friendship);

    // Bắn thông báo lời mời kết bạn mới cho người nhận
    await this.sendNotificationSafe({
      userId: addresseeId,
      type: NotificationType.FRIEND_REQUEST,
      title: `${requesterFullName} vừa gửi cho bạn một lời mời kết bạn`,
      body: 'Nhấn để xem và phản hồi lời mời kết bạn',
      relatedEntityType: 'FRIENDSHIP',
      relatedEntityId: saved.id,
    });

    return saved;
  }

  // ── 3. DANH SÁCH LỜI MỜI ĐANG CHỜ ─────────────────────────────────────────

  /**
   * Xem danh sách lời mời kết bạn đang chờ phản hồi.
   * Hỗ trợ lọc theo lời mời nhận được (received) hoặc lời mời đã gửi đi (sent).
   */
  async getPendingRequests(
    userId: string,
    query: PendingRequestQueryDto,
  ): Promise<PendingFriendRequestResponseDto[]> {
    const type = query.type ?? PendingRequestType.RECEIVED;
    const requests = await this.friendshipRepo.findPendingRequests(userId, type);

    return requests.map((req) => this.friendMapper.toPendingRequestResponse(req, userId));
  }

  // ── 4. CHẤP NHẬN KẾT BẠN ──────────────────────────────────────────────────

  /**
   * Người nhận (addressee) chấp nhận lời mời kết bạn.
   * Gửi thông báo FRIEND_ACCEPTED cho người gửi lời mời ban đầu.
   */
  async acceptRequest(userId: string, userFullName: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findById(friendshipId);
    if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
      throw new FriendshipNotFoundException();
    }
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chấp nhận lời mời này');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    friendship.respondedAt = new Date();
    const saved = await this.friendshipRepo.save(friendship);

    // Bắn thông báo cho người gửi ban đầu
    await this.sendNotificationSafe({
      userId: friendship.requesterId,
      type: NotificationType.FRIEND_ACCEPTED,
      title: `${userFullName} đã chấp nhận lời mời kết bạn của bạn`,
      body: 'Hai bạn đã chính thức trở thành bạn bè trên FINORA',
      relatedEntityType: 'FRIENDSHIP',
      relatedEntityId: saved.id,
    });

    return saved;
  }

  // ── 5. TỪ CHỐI KẾT BẠN ────────────────────────────────────────────────────

  /**
   * Người nhận (addressee) từ chối lời mời kết bạn.
   */
  async rejectRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findById(friendshipId);
    if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
      throw new FriendshipNotFoundException();
    }
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền từ chối lời mời này');
    }

    friendship.status = FriendshipStatus.REJECTED;
    friendship.respondedAt = new Date();
    return this.friendshipRepo.save(friendship);
  }

  // ── 6. LẤY DANH BẠ BẠN BÈ ─────────────────────────────────────────────────

  /**
   * Lấy danh sách bạn bè đã chấp nhận kết bạn (ACCEPTED) có phân trang.
   */
  async getFriends(
    userId: string,
    queryDto: FriendQueryDto,
  ): Promise<{ items: FriendResponseDto[]; total: number }> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await this.friendshipRepo.findFriendsPaged(userId, skip, limit);
    const data = items.map((f) => this.friendMapper.toFriendResponse(f, userId));

    return { items: data, total };
  }

  // ── 7. HỦY KẾT BẠN ───────────────────────────────────────────────────────

  /**
   * Hủy kết bạn giữa 2 người dùng.
   */
  async unfriend(userId: string, friendId: string) {
    const friendship = await this.friendshipRepo.findBetweenUsers(userId, friendId);
    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new FriendshipNotFoundException();
    }
    await this.friendshipRepo.remove(friendship);
    return { success: true };
  }

  // ── 8. CHẶN NGƯỜI DÙNG ───────────────────────────────────────────────────

  /**
   * Chặn người dùng (Block).
   */
  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Không thể tự chặn chính mình');
    }

    let friendship = await this.friendshipRepo.findBetweenUsers(userId, targetUserId);
    if (!friendship) {
      friendship = this.friendshipRepo.create({
        requesterId: userId,
        addresseeId: targetUserId,
        status: FriendshipStatus.BLOCKED,
      });
    } else {
      friendship.status = FriendshipStatus.BLOCKED;
      friendship.requesterId = userId;
      friendship.addresseeId = targetUserId;
    }
    return this.friendshipRepo.save(friendship);
  }

  // ── 9. KIỂM TRA TRẠNG THÁI QUAN HỆ ────────────────────────────────────────

  /**
   * Kiểm tra trạng thái quan hệ giữa user hiện tại và targetUserId.
   */
  async getStatus(
    userId: string,
    targetUserId: string,
  ): Promise<FriendshipStatusResponseDto> {
    const friendship = await this.friendshipRepo.findBetweenUsers(userId, targetUserId);
    if (!friendship) {
      return { status: null, isRequester: false };
    }
    return {
      status: friendship.status,
      isRequester: friendship.requesterId === userId,
    };
  }

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
   * Dùng cho FeedService, DirectMessages kiểm tra quyền truy cập.
   */
  async areFriends(userA: string, userB: string): Promise<boolean> {
    return this.friendshipRepo.existsAcceptedBetween(userA, userB);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Gửi thông báo an toàn: sự cố thông báo không làm gián đoạn luồng nghiệp vụ chính.
   */
  private async sendNotificationSafe(dto: CreateNotificationDto): Promise<void> {
    try {
      await this.notificationsService.createNotification(dto);
    } catch {
      // Bỏ qua lỗi gửi thông báo để đảm bảo tính toàn vẹn nghiệp vụ
    }
  }
}