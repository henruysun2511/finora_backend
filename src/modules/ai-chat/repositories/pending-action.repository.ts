// src/modules/ai-chat/repositories/pending-action.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { PendingAction } from '../entities/pending-action.entity';
import { PendingActionStatus } from '../enums/pending-action-status.enum';

@Injectable()
export class PendingActionRepository {
  constructor(
    @InjectRepository(PendingAction)
    private readonly repo: Repository<PendingAction>,
  ) {}

  async createAndSave(data: {
    userId: string;
    walletId: string;
    toolName: string;
    toolInput: Record<string, any>;
    previewPayload: Record<string, any>;
    expiresAt: Date;
    chatMessageId?: string | null;
  }): Promise<PendingAction> {
    const entity = this.repo.create({
      userId: data.userId,
      walletId: data.walletId,
      toolName: data.toolName,
      toolInput: data.toolInput,
      previewPayload: data.previewPayload,
      expiresAt: data.expiresAt,
      chatMessageId: data.chatMessageId || null,
      status: PendingActionStatus.PENDING,
    });
    return this.repo.save(entity);
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<PendingAction | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async findByChatMessageIds(
    ids: string[],
    userId: string,
  ): Promise<PendingAction[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { chatMessageId: In(ids), userId } });
  }

  async attachChatMessage(id: string, chatMessageId: string): Promise<void> {
    await this.repo.update({ id }, { chatMessageId });
  }

  /**
   * Khoá hàng (SELECT ... FOR UPDATE) trong một transaction để 2 lần bấm "Xác nhận" đồng thời
   * không thể tạo 2 giao dịch. Trả null nếu không tìm thấy.
   */
  async withLock<T>(
    id: string,
    userId: string,
    work: (action: PendingAction, manager: EntityManager) => Promise<T>,
  ): Promise<T | null> {
    return this.repo.manager.transaction(async (manager) => {
      const action = await manager
        .getRepository(PendingAction)
        .createQueryBuilder('pa')
        .setLock('pessimistic_write')
        .where('pa.id = :id', { id })
        .andWhere('pa.user_id = :userId', { userId })
        .getOne();
      if (!action) return null;
      return work(action, manager);
    });
  }

  async markStatus(
    id: string,
    status: PendingActionStatus,
    transactionId?: string | null,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(PendingAction) : this.repo;
    await repo.update(
      { id },
      { status, ...(transactionId ? { transactionId } : {}) },
    );
  }

  async rejectPendingByWallet(
    walletId: string,
    userId: string,
  ): Promise<number> {
    const res = await this.repo.update(
      { walletId, userId, status: PendingActionStatus.PENDING },
      { status: PendingActionStatus.REJECTED },
    );
    return res.affected || 0;
  }

  async expireOldPendingActions(): Promise<number> {
    const result = await this.repo.update(
      { status: PendingActionStatus.PENDING, expiresAt: LessThan(new Date()) },
      { status: PendingActionStatus.EXPIRED },
    );
    return result.affected || 0;
  }
}
