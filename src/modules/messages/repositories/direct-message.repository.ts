import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectMessage } from '../entities/direct-message.entity';

@Injectable()
export class DirectMessageRepository {
  constructor(
    @InjectRepository(DirectMessage)
    private readonly repo: Repository<DirectMessage>,
  ) {}

  create(data: Partial<DirectMessage>): DirectMessage {
    return this.repo.create(data);
  }

  save(message: DirectMessage): Promise<DirectMessage> {
    return this.repo.save(message);
  }

  findById(id: string): Promise<DirectMessage | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['replyToMessage', 'reactions', 'relatedTransaction'],
    });
  }

  /**
   * Lấy lịch sử tin nhắn giữa 2 người dùng, phân trang, sắp xếp mới nhất trước.
   * Eager load replyToMessage (snippet) và reactions.
   */
  async findHistory(
    userA: string,
    userB: string,
    skip: number,
    take: number,
    beforeCreatedAt?: Date,
    beforeId?: string,
  ): Promise<[DirectMessage[], number]> {
    const query = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.replyToMessage', 'reply')
      .leftJoinAndSelect('m.reactions', 'reactions')
      .leftJoinAndSelect('m.relatedTransaction', 'relatedTransaction')
      .where('m.deletedAt IS NULL')
      .andWhere(
        '((m.senderId = :userA AND m.receiverId = :userB) OR (m.senderId = :userB AND m.receiverId = :userA))',
        { userA, userB },
      )
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .skip(skip)
      .take(take);

    if (beforeCreatedAt && beforeId) {
      query.andWhere(
        '(m.createdAt < :beforeCreatedAt OR (m.createdAt = :beforeCreatedAt AND m.id < :beforeId))',
        { beforeCreatedAt, beforeId },
      );
    }

    return query
      .getManyAndCount();
  }

  /**
   * Lấy danh sách cuộc trò chuyện gần nhất của userId.
   * Trả về raw result: friendId, friendFullName, friendAvatar, lastContent, lastSenderId, lastAt, unreadCount.
   */
  async findRecentConversations(
    userId: string,
    search?: string,
  ): Promise<
    {
      friendId: string;
      friendFullName: string;
      friendAvatar: string | null;
      lastMessageContent: string;
      lastMessageSenderId: string;
      lastMessageAt: Date;
      unreadCount: number;
    }[]
  > {
    // Sub-query: tìm tin nhắn mới nhất với mỗi bạn chat
    const qb = this.repo
      .createQueryBuilder('m')
      .select(
        `CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END`,
        'friendId',
      )
      .addSelect('u.full_name', 'friendFullName')
      .addSelect('u.avatar', 'friendAvatar')
      .addSelect('last_msg.content', 'lastMessageContent')
      .addSelect('last_msg.sender_id', 'lastMessageSenderId')
      .addSelect('last_msg.created_at', 'lastMessageAt')
      .addSelect(
        `COALESCE(unread.cnt, 0)`,
        'unreadCount',
      )
      .innerJoin(
        (subQuery) =>
          subQuery
            .select(
              `CASE WHEN sub.sender_id = :userId THEN sub.receiver_id ELSE sub.sender_id END`,
              'friend_id',
            )
            .addSelect('MAX(sub.created_at)', 'max_at')
            .from(DirectMessage, 'sub')
            .where('sub.deleted_at IS NULL')
            .andWhere('(sub.sender_id = :userId OR sub.receiver_id = :userId)')
            .groupBy(
              `CASE WHEN sub.sender_id = :userId THEN sub.receiver_id ELSE sub.sender_id END`,
            ),
        'latest',
        `CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END = latest.friend_id AND m.created_at = latest.max_at`,
      )
      .innerJoin(
        'users',
        'u',
        `u.id = CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END`,
      )
      .innerJoin(
        DirectMessage,
        'last_msg',
        `last_msg.id = m.id`,
      )
      .leftJoin(
        (subQuery) =>
          subQuery
            .select(
              'cnt_sub.sender_id',
              'sender_id',
            )
            .addSelect('COUNT(*)', 'cnt')
            .from(DirectMessage, 'cnt_sub')
            .where('cnt_sub.deleted_at IS NULL')
            .andWhere('cnt_sub.receiver_id = :userId')
            .andWhere('cnt_sub.is_read = false')
            .groupBy('cnt_sub.sender_id'),
        'unread',
        `unread.sender_id = CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END`,
      )
      .where('m.deleted_at IS NULL')
      .andWhere('(m.sender_id = :userId OR m.receiver_id = :userId)')
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM friendships f
          WHERE f.deleted_at IS NULL
            AND f.status = 'ACCEPTED'
            AND (
              (f.requester_id = :userId AND f.addressee_id = CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END)
              OR
              (f.addressee_id = :userId AND f.requester_id = CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END)
            )
        )`,
      )
      .setParameter('userId', userId)
      .orderBy('last_msg.created_at', 'DESC');

    if (search) {
      qb.andWhere(
        '(u.full_name ILIKE :search OR u.username ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      friendId: r.friendId,
      friendFullName: r.friendFullName,
      friendAvatar: r.friendAvatar ?? null,
      lastMessageContent: r.lastMessageContent,
      lastMessageSenderId: r.lastMessageSenderId,
      lastMessageAt: new Date(r.lastMessageAt),
      unreadCount: Number(r.unreadCount),
    }));
  }

  /**
   * Đánh dấu tất cả tin nhắn từ senderId gửi cho receiverId thành đã đọc.
   */
  async markAllAsRead(senderId: string, receiverId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(DirectMessage)
      .set({ isRead: true })
      .where('sender_id = :senderId', { senderId })
      .andWhere('receiver_id = :receiverId', { receiverId })
      .andWhere('is_read = false')
      .andWhere('deleted_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Soft delete tin nhắn.
   */
  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
