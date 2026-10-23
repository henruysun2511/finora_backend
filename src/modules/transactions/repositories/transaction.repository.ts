import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionQueryDto } from '../dto/request/transaction-query.dto';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';
@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  create(data: Partial<Transaction>): Transaction {
    return this.repo.create(data);
  }

  save(transaction: Transaction, manager?: EntityManager): Promise<Transaction> {
    return manager ? manager.save(transaction) : this.repo.save(transaction);
  }

  findById(id: string, manager?: EntityManager): Promise<Transaction | null> {
    const repository = manager ? manager.getRepository(Transaction) : this.repo;
    return repository.findOne({
      where: { id },
      relations: ['account', 'category'],
    });
  }

  findByRecurringId(recurringTransactionId: string): Promise<Transaction[]> {
    return this.repo.find({
      where: { recurringTransactionId },
      order: { transactionDate: 'DESC' },
    });
  }

  async findPaged(
    query: TransactionQueryDto,
    accessibleAccountIds: string[],
  ): Promise<[Transaction[], number]> {
    if (accessibleAccountIds.length === 0) {
      return [[], 0];
    }

    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.category', 'category');

    qb.where('t.accountId IN (:...accessibleAccountIds)', {
      accessibleAccountIds,
    });
    qb.andWhere('t.deletedAt IS NULL');

    if (query.accountId) {
      qb.andWhere('t.accountId = :accountId', { accountId: query.accountId });
    }

    if (query.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.type) {
      qb.andWhere('t.type = :type', { type: query.type });
    }

    if (query.startDate) {
      qb.andWhere('t.transactionDate >= :startDate', { startDate: new Date(query.startDate) });
    }

    if (query.endDate) {
      qb.andWhere('t.transactionDate <= :endDate', { endDate: new Date(query.endDate) });
    }

    if (query.visibility) {
      qb.andWhere('t.visibility = :visibility', { visibility: query.visibility });
    }

    qb.orderBy('t.transactionDate', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    return qb.getManyAndCount();
  }

  async findForDailyGrid(
    accessibleAccountIds: string[],
    options: {
      startDate: Date;
      endDate: Date;
      accountId?: string;
      categoryId?: string;
      type?: TransactionType;
      visibility?: TransactionVisibility;
    },
  ): Promise<Transaction[]> {
    if (accessibleAccountIds.length === 0) {
      return [];
    }

    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.accountId IN (:...accessibleAccountIds)', { accessibleAccountIds })
      .andWhere('t.deletedAt IS NULL')
      .andWhere('t.transactionDate >= :startDate', { startDate: options.startDate })
      .andWhere('t.transactionDate <= :endDate', { endDate: options.endDate });

    if (options.accountId) {
      qb.andWhere('t.accountId = :accountId', { accountId: options.accountId });
    }

    if (options.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: options.categoryId });
    }

    if (options.type) {
      qb.andWhere('t.type = :type', { type: options.type });
    }

    if (options.visibility) {
      qb.andWhere('t.visibility = :visibility', { visibility: options.visibility });
    }

    qb.orderBy('t.transactionDate', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    return qb.getMany();
  }
async findFriendsFeed(
    authorIds: string[],
    page: number,
    limit: number,
  ): Promise<[Transaction[], number]> {
    if (authorIds.length === 0) {
      return [[], 0];
    }

    return this.repo
      .createQueryBuilder('t')
      .leftJoin('t.creator', 'creator')
      .addSelect(['creator.id', 'creator.fullName', 'creator.username', 'creator.avatar'])
      .leftJoin('t.category', 'category')
      .addSelect(['category.id', 'category.name', 'category.icon', 'category.color'])
      .where('t.createdBy IN (:...authorIds)', { authorIds })
      .andWhere('t.visibility = :visibility', { visibility: TransactionVisibility.FRIENDS })
      .andWhere('t.deletedAt IS NULL')
      .orderBy('t.transactionDate', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(Transaction) : this.repo;
    await repository.softDelete(id);
  }
}
