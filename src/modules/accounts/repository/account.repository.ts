// src/modules/accounts/repository/account.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { AccountBalanceAdjustment } from '../entities/account-balance-adjustment.entity';
import { AccountQueryDto } from '../dto/request/account-query.dto';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  create(data: Partial<Account>): Account {
    return this.repo.create(data);
  }

  save(account: Account, manager?: EntityManager): Promise<Account> {
    if (manager) return manager.save(Account, account);
    return this.repo.save(account);
  }

  findById(id: string): Promise<Account | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Khóa dòng (SELECT ... FOR UPDATE) để chống xử lý đồng thời. Chỉ dùng trong transaction. */
  findByIdForUpdate(id: string, manager: EntityManager): Promise<Account | null> {
    return manager.findOne(Account, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findByIdempotencyKey(userId: string, key: string): Promise<Account | null> {
    return this.repo.findOne({ where: { createdBy: userId, idempotencyKey: key } });
  }

  findByWalletAndName(walletId: string, name: string): Promise<Account | null> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.walletId = :walletId', { walletId })
      .andWhere('LOWER(a.name) = LOWER(:name)', { name })
      .getOne();
  }

  async findPaged(query: AccountQueryDto, walletIds: string[]): Promise<[Account[], number]> {
    if (!walletIds.length) return [[], 0];

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.walletId IN (:...walletIds)', { walletIds })
      .andWhere('a.isArchived = :isArchived', { isArchived: query.isArchived });

    if (query.keyword) {
      qb.andWhere('a.name ILIKE :keyword', { keyword: `%${query.keyword}%` });
    }
    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (query.currency) qb.andWhere('a.currency = :currency', { currency: query.currency });

    return qb
      .orderBy('a.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  /**
   * Tài khoản đã có lịch sử tài chính chưa?
   * Kiểm tra bảng điều chỉnh số dư và mọi bảng con khai báo @OneToMany trên Account
   * (transactions, transfers đi/đến, loanPayments, receipts). Tính cả bản ghi đã xóa mềm.
   */
  async hasFinancialHistory(accountId: string, manager: EntityManager): Promise<boolean> {
    const adjustments = await manager.count(AccountBalanceAdjustment, {
      where: { accountId },
      withDeleted: true,
    });
    if (adjustments > 0) return true;

    const metadata = manager.connection.getMetadata(Account);
    for (const relation of metadata.oneToManyRelations) {
      const inverse = relation.inverseRelation;
      if (!inverse) continue;
      const count = await manager
        .createQueryBuilder(relation.inverseEntityMetadata.target as any, 'child')
        .where(`child.${inverse.propertyName} = :accountId`, { accountId })
        .withDeleted()
        .getCount();
      if (count > 0) return true;
    }
    return false;
  }

  async softDelete(id: string, manager: EntityManager): Promise<void> {
    await manager.softDelete(Account, { id });
  }

  async findAccountIdsByWalletIds(walletIds: string[]): Promise<string[]> {
    if (!walletIds.length) return [];
    const accounts = await this.repo
      .createQueryBuilder('a')
      .select('a.id')
      .where('a.walletId IN (:...walletIds)', { walletIds })
      .getMany();
    return accounts.map((a) => a.id);
  }
}