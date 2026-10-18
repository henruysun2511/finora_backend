// src/modules/accounts/repository/account-balance-adjustment.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AccountBalanceAdjustment } from '../entities/account-balance-adjustment.entity';

@Injectable()
export class AccountBalanceAdjustmentRepository {
  constructor(
    @InjectRepository(AccountBalanceAdjustment)
    private readonly repo: Repository<AccountBalanceAdjustment>,
  ) {}

  create(data: Partial<AccountBalanceAdjustment>): AccountBalanceAdjustment {
    return this.repo.create(data);
  }

  save(
    adjustment: AccountBalanceAdjustment,
    manager?: EntityManager,
  ): Promise<AccountBalanceAdjustment> {
    if (manager) return manager.save(AccountBalanceAdjustment, adjustment);
    return this.repo.save(adjustment);
  }

  findByKey(
    accountId: string,
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<AccountBalanceAdjustment | null> {
    const where = { accountId, idempotencyKey };
    if (manager) return manager.findOne(AccountBalanceAdjustment, { where });
    return this.repo.findOne({ where });
  }
}