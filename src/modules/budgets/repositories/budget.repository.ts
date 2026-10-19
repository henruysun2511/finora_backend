import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { BudgetQueryDto } from '../dto/request/budget-query.dto';

@Injectable()
export class BudgetRepository {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
  ) {}

  create(data: Partial<Budget>): Budget {
    return this.repo.create(data);
  }

  save(budget: Budget, manager?: EntityManager): Promise<Budget> {
    return manager ? manager.save(Budget, budget) : this.repo.save(budget);
  }

  findById(id: string, manager?: EntityManager): Promise<Budget | null> {
    const repo = manager ? manager.getRepository(Budget) : this.repo;
    return repo.findOne({ where: { id }, relations: ['category'] });
  }

  findByWalletCategoryPeriod(
    walletId: string,
    categoryId: string,
    period: Budget['period'],
  ): Promise<Budget | null> {
    return this.repo.findOne({ where: { walletId, categoryId, period } });
  }

  async findPaged(
    query: BudgetQueryDto,
    walletIds: string[],
  ): Promise<[Budget[], number]> {
    if (walletIds.length === 0) return [[], 0];
    const qb = this.repo
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.category', 'category')
      .where('budget.walletId IN (:...walletIds)', { walletIds });

    if (query.walletId)
      qb.andWhere('budget.walletId = :walletId', { walletId: query.walletId });
    if (query.categoryId)
      qb.andWhere('budget.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    if (query.period)
      qb.andWhere('budget.period = :period', { period: query.period });

    return qb
      .orderBy('budget.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findActiveByWalletCategory(
    walletId: string,
    categoryId: string,
    manager?: EntityManager,
  ): Promise<Budget[]> {
    const repo = manager ? manager.getRepository(Budget) : this.repo;
    return repo.find({
      where: { walletId, categoryId },
      relations: ['category'],
    });
  }

  findActiveByWalletIds(walletIds: string[]): Promise<Budget[]> {
    if (walletIds.length === 0) return Promise.resolve([]);
    return this.repo.find({
      where: { walletId: In(walletIds) },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  findAllActive(): Promise<Budget[]> {
    return this.repo.find({ relations: ['category'] });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
