// src/modules/friends/friends.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource, ILike, Not, Brackets } from 'typeorm';
import { FriendshipRepository } from './repository/friends.repository';
import { FriendMapper } from './mapper/friends.mapper';
import { FriendshipStatus } from './enums/friendship-status.enum';
import { SendFriendRequestDto } from './dto/request/send-friend-request.dto';
import { FriendQueryDto } from './dto/request/friend-query.dto';
import { SearchUserQueryDto } from './dto/request/search-user-query.dto';
import { 
  CannotFriendSelfException, 
  FriendRequestAlreadyExistsException, 
  AlreadyFriendsException, 
  UserBlockedException, 
  FriendshipNotFoundException 
} from './exceptions/friends.exception';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly friendshipRepo: FriendshipRepository,
    private readonly friendMapper: FriendMapper,
  ) {}

  // 1. GET /api/v1/friends/search — Tìm kiếm người dùng
  async searchUsers(currentUserId: string, queryDto: SearchUserQueryDto) {
    const keyword = queryDto.query ? `%${queryDto.query}%` : '%';
    
    // Lấy danh sách user khớp từ khóa nhưng loại trừ chính mình
    const userRepository = this.dataSource.getRepository(User);
    const users = await userRepository.find({
      where: [
        { fullName: ILike(keyword), id: Not(currentUserId) },
        { email: ILike(keyword), id: Not(currentUserId) },
      ],
      take: 20,
    });

    // Lấy kèm trạng thái quan hệ với currentUserId để UI hiển thị nút tương ứng (Kết bạn, Đã gửi, Bạn bè...)
    const results = await Promise.all(
      users.map(async (user) => {
        const relation = await this.friendshipRepo.findBetweenUsers(currentUserId, user.id);
        let relationStatus: string = 'NONE';
        if (relation) {
          if (relation.status === FriendshipStatus.ACCEPTED) relationStatus = 'ACCEPTED';
          else if (relation.status === FriendshipStatus.PENDING) {
            relationStatus = relation.requesterId === currentUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
          } else if (relation.status === FriendshipStatus.BLOCKED) relationStatus = 'BLOCKED';
        }
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          relationStatus,
        };
      }),
    );

    return results;
  }

  // 2. POST /api/v1/friends/request — Gửi lời mời kết bạn (Xử lý Auto-Accept nếu có thuận chiều ngược lại)
  async sendRequest(requesterId: string, dto: SendFriendRequestDto) {
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
      // Ràng buộc Anti-Spam & Auto-Accept:
      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requesterId === requesterId) {
          throw new FriendRequestAlreadyExistsException();
        } else {
          // B đã gửi cho A trước đó, giờ A gửi lại -> Tự động chuyển thành ACCEPTED
          existing.status = FriendshipStatus.ACCEPTED;
          existing.respondedAt = new Date();
          return this.friendshipRepo.save(existing);
        }
      }
    }

    const friendship = this.friendshipRepo.create({
      requesterId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });
    return this.friendshipRepo.save(friendship);
  }

  // 3. GET /api/v1/friends/pending-requests — Xem lời mời đang chờ
  async getPendingRequests(userId: string) {
    const requests = await this.friendshipRepo.findPendingRequests(userId);
    return requests.map((req) => ({
      id: req.id,
      requester: {
        id: req.requester.id,
        fullName: req.requester.fullName,
        email: req.requester.email,
        avatar: req.requester.avatar,
      },
      createdAt: req.createdAt,
    }));
  }

  // 4. POST /api/v1/friends/request/:id/accept — Chấp nhận kết bạn
  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipRepo.findById(friendshipId);
    if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
      throw new FriendshipNotFoundException();
    }
    // Chỉ người nhận (addressee) mới có quyền accept
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chấp nhận lời mời này');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    friendship.respondedAt = new Date();
    return this.friendshipRepo.save(friendship);
  }

  // 5. POST /api/v1/friends/request/:id/reject — Từ chối kết bạn
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

  // 6. GET /api/v1/friends — Lấy danh bạ bạn bè (Phân trang)
  async getFriends(userId: string, queryDto: FriendQueryDto) {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const { items, total } = await this.friendshipRepo.findFriendsPaged(userId, skip, limit);
    const data = items.map((friendship) => this.friendMapper.toFriendResponse(friendship, userId));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 7. DELETE /api/v1/friends/:id — Hủy kết bạn (Xóa quan hệ)
  async unfriend(userId: string, friendId: string) {
    const friendship = await this.friendshipRepo.findBetweenUsers(userId, friendId);
    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new FriendshipNotFoundException();
    }
    await this.friendshipRepo.remove(friendship);
    return { success: true };
  }

  // 8. POST /api/v1/friends/:id/block — Chặn người dùng
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
      // Đảm bảo requesterId là người thực hiện chặn nếu cần, hoặc cập nhật linh hoạt
      friendship.requesterId = userId;
      friendship.addresseeId = targetUserId;
    }
    return this.friendshipRepo.save(friendship);
  }

  // 9. GET /api/v1/friends/:targetUserId/status — Kiểm tra trạng thái quan hệ
  async getStatus(userId: string, targetUserId: string) {
    const friendship = await this.friendshipRepo.findBetweenUsers(userId, targetUserId);
    if (!friendship) {
      return { status: null, isRequester: false };
    }
    return {
      status: friendship.status,
      isRequester: friendship.requesterId === userId,
    };
  }

  // Cross-module method cho Feed & Transactions gọi kiểm tra quyền xem bài
  async areFriends(userA: string, userB: string): Promise<boolean> {
    const friendship = await this.friendshipRepo.findBetweenUsers(userA, userB);
    return friendship?.status === FriendshipStatus.ACCEPTED;
  }
}