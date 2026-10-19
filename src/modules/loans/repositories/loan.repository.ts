import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus } from '../enums/loan-status.enum';
import { LoanType } from '../enums/loan-type.enum';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class LoanRepository {
  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
  ) {}

  create(data: Partial<Loan>): Loan {
    return this.repo.create(data);
  }

  async save(loan: Loan, manager?: EntityManager): Promise<Loan> {
    if (manager) {
      return manager.save(Loan, loan);
    }
    return this.repo.save(loan);
  }

  async findById(id: string, manager?: EntityManager): Promise<Loan | null> {
    const r = manager ? manager.getRepository(Loan) : this.repo;
    return r.findOne({ where: { id } });
  }

  async findByIdWithRelations(
    id: string,
    manager?: EntityManager,
  ): Promise<Loan | null> {
    const r = manager ? manager.getRepository(Loan) : this.repo;
    return r.findOne({
      where: { id },
      relations: [
        'account',
        'wallet',
        'creator',
        'counterpartyUser',
        'payments',
        'payments.account',
      ],
      order: {
        payments: {
          paymentDate: 'DESC',
          createdAt: 'DESC',
        },
      },
    });
  }

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<Loan | null> {
    return manager
      .getRepository(Loan)
      .createQueryBuilder('loan')
      .setLock('pessimistic_write')
      .where('loan.id = :id', { id })
      .andWhere('loan.deletedAt IS NULL')
      .getOne();
  }

  async updateStatusOverdue(walletId?: string): Promise<void> {
    const qb = this.repo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: LoanStatus.OVERDUE })
      .where('status = :activeStatus', { activeStatus: LoanStatus.ACTIVE })
      .andWhere('due_date IS NOT NULL')
      .andWhere('due_date < NOW()')
      .andWhere('deleted_at IS NULL');

    if (walletId) {
      qb.andWhere('wallet_id = :walletId', { walletId });
    }

    await qb.execute();
  }

  async findPaged(
    walletId: string,
    query: {
      type?: LoanType;
      status?: LoanStatus;
      search?: string;
      page: number;
      limit: number;
    },
  ): Promise<[Loan[], number]> {
    const qb = this.repo
      .createQueryBuilder('loan')
      .where('loan.walletId = :walletId', { walletId })
      .andWhere('loan.deletedAt IS NULL');

    if (query.type) {
      qb.andWhere('loan.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('loan.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere('loan.contactName ILIKE :search', {
        search: `%${query.search.trim()}%`,
      });
    }

    // Ưu tiên OVERDUE lên đầu, sau đó createdAt DESC
    qb.addSelect(
      `CASE WHEN loan.status = '${LoanStatus.OVERDUE}' THEN 1 ELSE 2 END`,
      'priority_status',
    );
    qb.orderBy('priority_status', 'ASC')
      .addOrderBy('loan.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    return qb.getManyAndCount();
  }

  async getSummary(walletId: string): Promise<{
    totalLent: number;
    totalBorrowed: number;
    netBalance: number;
    overdueCount: number;
    activeCount: number;
    currency: string;
  }> {
    const raw = await this.repo
      .createQueryBuilder('loan')
      .select([
        `COALESCE(SUM(CASE WHEN loan.type = '${LoanType.LENT}' THEN loan.remainingAmount ELSE 0 END), 0) AS "totalLent"`,
        `COALESCE(SUM(CASE WHEN loan.type IN ('${LoanType.BORROWED}', '${LoanType.INSTALLMENT}') THEN loan.remainingAmount ELSE 0 END), 0) AS "totalBorrowed"`,
        `COALESCE(COUNT(CASE WHEN loan.status = '${LoanStatus.OVERDUE}' THEN 1 END), 0) AS "overdueCount"`,
        `COALESCE(COUNT(CASE WHEN loan.status = '${LoanStatus.ACTIVE}' THEN 1 END), 0) AS "activeCount"`,
      ])
      .where('loan.walletId = :walletId', { walletId })
      .andWhere('loan.deletedAt IS NULL')
      .andWhere('loan.status IN (:...statuses)', {
        statuses: [LoanStatus.ACTIVE, LoanStatus.OVERDUE],
      })
      .getRawOne();

    const totalLent = Number(raw?.totalLent || 0);
    const totalBorrowed = Number(raw?.totalBorrowed || 0);
    const overdueCount = Number(raw?.overdueCount || 0);
    const activeCount = Number(raw?.activeCount || 0);
    const netBalance = round2(totalLent - totalBorrowed);

    return {
      totalLent,
      totalBorrowed,
      netBalance,
      overdueCount,
      activeCount,
      currency: 'VND',
    };
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.softDelete(Loan, id);
    } else {
      await this.repo.softDelete(id);
    }
  }
}
