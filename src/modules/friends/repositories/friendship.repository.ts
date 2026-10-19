import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enums/friendship-status.enum';

@Injectable()
export class FriendshipRepository {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
  ) {}

  /** Lấy toàn bộ quan hệ bạn bè đã chấp nhận (ACCEPTED) mà user tham gia. */
  findAcceptedByUserId(userId: string): Promise<Friendship[]> {
    return this.repo
      .createQueryBuilder('f')
      .where('f.deletedAt IS NULL')
      .andWhere('f.status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('(f.requesterId = :userId OR f.addresseeId = :userId)', { userId })
      .getMany();
  }

  /** Kiểm tra 2 user có quan hệ bạn bè đã chấp nhận (không phân biệt chiều gửi lời mời). */
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
}