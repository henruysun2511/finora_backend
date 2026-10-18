// src/modules/friends/repository/friendship.repository.ts
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

  // Tìm quan hệ giữa 2 user bất kỳ (bất kể chiều A->B hay B->A)
  findBetweenUsers(userA: string, userB: string): Promise<Friendship | null> {
    return this.repo.findOne({
      where: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    });
  }

  // Lấy danh sách bạn bè đã ACCEPTED của một user (phân trang)
  async findFriendsPaged(userId: string, skip: number, take: number) {
    const [items, total] = await this.repo.findAndCount({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
      skip,
      take,
    });
    return { items, total };
  }
  // Thêm method remove vào friendship.repository.ts
  remove(friendship: Friendship, manager?: EntityManager): Promise<Friendship> {
    if (manager) {
      return manager.remove(friendship);
    }
    return this.repo.remove(friendship);
  }

  // Lấy danh sách lời mời kết bạn đang PENDING mà user này nhận được
  findPendingRequests(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ['requester'],
    });
  }
}