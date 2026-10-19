import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BudgetPeriod } from '../entities/budget-period.entity';

@Injectable()
export class BudgetPeriodRepository {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly repo: Repository<BudgetPeriod>,
  ) {}

  create(data: Partial<BudgetPeriod>): BudgetPeriod {
    return this.repo.create(data);
  }

  save(period: BudgetPeriod, manager?: EntityManager): Promise<BudgetPeriod> {
    return manager
      ? manager.save(BudgetPeriod, period)
      : this.repo.save(period);
  }

  async createOrGet(
    data: Partial<BudgetPeriod>,
    manager?: EntityManager,
  ): Promise<BudgetPeriod> {
    const repo = manager ? manager.getRepository(BudgetPeriod) : this.repo;
    await repo
      .createQueryBuilder()
      .insert()
      .into(BudgetPeriod)
      .values(data)
      .orIgnore()
      .execute();
    const period = await repo.findOne({
      where: {
        budgetId: data.budgetId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    if (!period) {
      throw new Error('Không thể tạo hoặc đọc lại chu kỳ ngân sách');
    }
    return period;
  }

  findByDate(
    budgetId: string,
    date: string,
    manager?: EntityManager,
  ): Promise<BudgetPeriod | null> {
    const repo = manager ? manager.getRepository(BudgetPeriod) : this.repo;
    const query = repo
      .createQueryBuilder('period')
      .where('period.budgetId = :budgetId', { budgetId })
      .andWhere('period.startDate <= :date AND period.endDate >= :date', {
        date,
      })
      .orderBy('period.startDate', 'DESC')
      .addOrderBy('period.createdAt', 'DESC');
    if (manager) query.setLock('pessimistic_write');
    return query.getOne();
  }

  findLatest(
    budgetId: string,
    manager?: EntityManager,
  ): Promise<BudgetPeriod | null> {
    const repo = manager ? manager.getRepository(BudgetPeriod) : this.repo;
    return repo.findOne({ where: { budgetId }, order: { startDate: 'DESC' } });
  }

  findAll(budgetId: string): Promise<BudgetPeriod[]> {
    return this.repo.find({
      where: { budgetId },
      order: { startDate: 'DESC' },
    });
  }

  async findAfter(
    budgetId: string,
    startDate: string,
    manager?: EntityManager,
  ): Promise<BudgetPeriod[]> {
    const repo = manager ? manager.getRepository(BudgetPeriod) : this.repo;
    return repo
      .createQueryBuilder('period')
      .where('period.budgetId = :budgetId', { budgetId })
      .andWhere('period.startDate > :startDate', { startDate })
      .orderBy('period.startDate', 'ASC')
      .getMany();
  }
}
