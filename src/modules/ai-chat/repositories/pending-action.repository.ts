// src/modules/ai-chat/repositories/pending-action.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
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

  async findByIdAndUser(id: string, userId: string): Promise<PendingAction | null> {
    return this.repo.findOne({
      where: { id, userId },
    });
  }

  async markStatus(
    id: string,
    status: PendingActionStatus,
    transactionId?: string | null,
  ): Promise<PendingAction | null> {
    const action = await this.repo.findOne({ where: { id } });
    if (!action) return null;

    action.status = status;
    if (transactionId) {
      action.transactionId = transactionId;
    }
    return this.repo.save(action);
  }

  async expireOldPendingActions(): Promise<number> {
    const now = new Date();
    const result = await this.repo.update(
      {
        status: PendingActionStatus.PENDING,
        expiresAt: LessThan(now),
      },
      {
        status: PendingActionStatus.EXPIRED,
      },
    );
    return result.affected || 0;
  }
}
