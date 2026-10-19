import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostReaction } from '../entities/post-reaction.entity';

@Injectable()
export class PostReactionRepository {
  constructor(
    @InjectRepository(PostReaction)
    private readonly repo: Repository<PostReaction>,
  ) {}

  create(data: Partial<PostReaction>): PostReaction {
    return this.repo.create(data);
  }

  save(reaction: PostReaction): Promise<PostReaction> {
    return this.repo.save(reaction);
  }

  findByPostAndUser(transactionId: string, userId: string): Promise<PostReaction | null> {
    return this.repo.findOne({ where: { transactionId, userId } });
  }

  /** Danh sách reaction của một bài đăng, kèm thông tin người thả (mới nhất trước). */
  findReactionsByPostId(transactionId: string): Promise<PostReaction[]> {
    return this.repo
      .createQueryBuilder('r')
      .leftJoin('r.user', 'user')
      .addSelect(['user.id', 'user.fullName', 'user.avatar'])
      .where('r.deletedAt IS NULL')
      .andWhere('r.transactionId = :transactionId', { transactionId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  /** Lấy reaction của nhiều bài đăng trong 1 query để tránh N+1 khi dựng Bảng tin. */
  async findByPostIds(transactionIds: string[]): Promise<PostReaction[]> {
    if (transactionIds.length === 0) return [];

    return this.repo
      .createQueryBuilder('r')
      .where('r.deletedAt IS NULL')
      .andWhere('r.transactionId IN (:...transactionIds)', { transactionIds })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  /** Xóa cứng để không vướng unique key [transactionId, userId] khi người dùng thả lại cảm xúc. */
  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}