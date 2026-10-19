import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Friendship } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enums/friendship-status.enum';

@Injectable()
export class FriendshipRepository {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
  ) {}

  create(data: Partial<Friendship>): Friendship {
    return this.repo.create(data);
  }

  save(friendship: Friendship, manager?: EntityManager): Promise<Friendship> {
    if (manager) {
      return manager.save(Friendship, friendship);
    }
    return this.repo.save(friendship);
  }

  findById(id: string): Promise<Friendship | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Tìm quan hệ giữa 2 người dùng bất kỳ (2 chiều A->B hoặc B->A).
   */
  findBetweenUsers(userA: string, userB: string): Promise<Friendship | null> {
    return this.repo
      .createQueryBuilder('f')
      .where('f.deletedAt IS NULL')
      .andWhere(
        '((f.requesterId = :userA AND f.addresseeId = :userB) OR (f.requesterId = :userB AND f.addresseeId = :userA))',
        { userA, userB },
      )
      .getOne();
  }

  /**
   * [TỐI ƯU HÓA N+1] Lấy toàn bộ quan hệ giữa user hiện tại và danh sách nhiều user trong 1 query.
   */
  findRelationsBetweenUserAndMany(
    currentUserId: string,
    targetUserIds: string[],
  ): Promise<Friendship[]> {
    if (targetUserIds.length === 0) return Promise.resolve([]);

    return this.repo
      .createQueryBuilder('f')
      .where('f.deletedAt IS NULL')
      .andWhere(
        '((f.requesterId = :currentUserId AND f.addresseeId IN (:...targetUserIds)) OR (f.addresseeId = :currentUserId AND f.requesterId IN (:...targetUserIds)))',
        { currentUserId, targetUserIds },
      )
      .getMany();
  }

  /**
   * Lấy danh sách bạn bè đã ACCEPTED của một user (phân trang chuẩn).
   */
  async findFriendsPaged(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[Friendship[], number]> {
    return this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .leftJoinAndSelect('f.addressee', 'addressee')
      .where('f.deletedAt IS NULL')
      .andWhere('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('(f.requesterId = :userId OR f.addresseeId = :userId)', { userId })
      .orderBy('f.updatedAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  /**
   * Lấy danh sách lời mời kết bạn đang PENDING:
   * - type = 'received' (mặc định): Lời mời gửi đến user này
   * - type = 'sent': Lời mời do user này gửi đi
   */
  findPendingRequests(
    userId: string,
    type: 'received' | 'sent' = 'received',
  ): Promise<Friendship[]> {
    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .leftJoinAndSelect('f.addressee', 'addressee')
      .where('f.deletedAt IS NULL')
      .andWhere('f.status = :status', { status: FriendshipStatus.PENDING });

    if (type === 'sent') {
      qb.andWhere('f.requesterId = :userId', { userId });
    } else {
      qb.andWhere('f.addresseeId = :userId', { userId });
    }

    return qb.orderBy('f.createdAt', 'DESC').getMany();
  }

  /**
   * [CROSS-MODULE] Lấy toàn bộ quan hệ bạn bè đã chấp nhận (ACCEPTED) mà user tham gia.
   */
  findAcceptedByUserId(userId: string): Promise<Friendship[]> {
    return this.repo
      .createQueryBuilder('f')
      .where('f.deletedAt IS NULL')
      .andWhere('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('(f.requesterId = :userId OR f.addresseeId = :userId)', { userId })
      .getMany();
  }

  /**
   * [CROSS-MODULE] Kiểm tra 2 user có quan hệ bạn bè đã chấp nhận hay chưa.
   */
  async existsAcceptedBetween(userA: string, userB: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('f')
      .where('f.deletedAt IS NULL')
      .andWhere('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere(
        '((f.requesterId = :userA AND f.addresseeId = :userB) OR (f.requesterId = :userB AND f.addresseeId = :userA))',
        { userA, userB },
      )
      .getCount();
    return count > 0;
  }

  /**
   * Xóa bản ghi quan hệ (xóa cứng để tránh conflict Unique constraint khi kết bạn lại).
   */
  remove(friendship: Friendship, manager?: EntityManager): Promise<Friendship> {
    if (manager) {
      return manager.remove(friendship);
    }
    return this.repo.remove(friendship);
  }
}
