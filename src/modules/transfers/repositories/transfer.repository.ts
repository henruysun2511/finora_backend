// src/modules/transfers/repositories/transfer.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Transfer } from '../entities/transfer.entity';
import { TransferQueryDto } from '../dto/request/transfer-query.dto';

@Injectable()
export class TransferRepository {
  constructor(
    @InjectRepository(Transfer)
    private readonly repo: Repository<Transfer>,
  ) {}

  create(data: Partial<Transfer>): Transfer {
    return this.repo.create(data);
  }

  save(transfer: Transfer, manager?: EntityManager): Promise<Transfer> {
    return manager ? manager.save(transfer) : this.repo.save(transfer);
  }

  findById(id: string): Promise<Transfer | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['fromAccount', 'toAccount', 'feeAccount'],
    });
  }

  async findPaged(
    query: TransferQueryDto,
    accessibleAccountIds: string[],
  ): Promise<[Transfer[], number]> {
    if (accessibleAccountIds.length === 0) {
      return [[], 0];
    }

    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromAccount', 'fromAccount')
      .leftJoinAndSelect('t.toAccount', 'toAccount')
      .leftJoinAndSelect('t.feeAccount', 'feeAccount');

    // Chỉ lấy các giao dịch mà tài khoản nguồn HOẶC tài khoản đích nằm trong danh sách được phép
    qb.where('(t.fromAccountId IN (:...accessibleAccountIds) OR t.toAccountId IN (:...accessibleAccountIds))', {
      accessibleAccountIds,
    });

    if (query.fromAccountId) {
      qb.andWhere('t.fromAccountId = :fromAccountId', { fromAccountId: query.fromAccountId });
    }

    if (query.toAccountId) {
      qb.andWhere('t.toAccountId = :toAccountId', { toAccountId: query.toAccountId });
    }

    if (query.accountId) {
      qb.andWhere('(t.fromAccountId = :accountId OR t.toAccountId = :accountId)', {
        accountId: query.accountId,
      });
    }

    if (query.startDate) {
      qb.andWhere('t.transferDate >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('t.transferDate <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('t.transferDate', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    return qb.getManyAndCount();
  }
}
