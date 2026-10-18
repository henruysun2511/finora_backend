import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationQueryDto } from '../dto/request/notification-query.dto';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  create(data: Partial<Notification>): Notification {
    return this.repo.create(data);
  }

  save(notification: Notification, manager?: EntityManager): Promise<Notification> {
    return manager ? manager.save(notification) : this.repo.save(notification);
  }

  findById(id: string, userId?: string): Promise<Notification | null> {
    const where: any = { id };
    if (userId) where.userId = userId;
    return this.repo.findOne({ where });
  }

  async findPaged(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<[Notification[], number]> {
    const qb = this.repo.createQueryBuilder('n');
    qb.where('n.userId = :userId', { userId });
    qb.andWhere('n.deletedAt IS NULL');

    if (query.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: query.isRead });
    }

    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    return qb.getManyAndCount();
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notif = await this.findById(id, userId);
    if (!notif) return null;

    if (!notif.isRead) {
      notif.isRead = true;
      return this.repo.save(notif);
    }
    return notif;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .andWhere('isRead = false')
      .andWhere('deletedAt IS NULL')
      .execute();

    return result.affected || 0;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const notif = await this.findById(id, userId);
    if (!notif) return false;

    await this.repo.softDelete(id);
    return true;
  }
}
