import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityManager, LessThanOrEqual } from 'typeorm';
import { RecurringTransaction } from '../entities/recurring-transaction.entity';
import { RecurringTransactionQueryDto } from '../dto/request/recurring-transaction-query.dto';

@Injectable()
export class RecurringTransactionRepository extends Repository<RecurringTransaction> {
  constructor(private readonly dataSource: DataSource) {
    super(RecurringTransaction, dataSource.createEntityManager());
  }

  /**
   * Lấy chi tiết quy tắc theo ID kèm quan hệ Account và Category
   */
  async findById(id: string, manager?: EntityManager): Promise<RecurringTransaction | null> {
    const repo = manager ? manager.getRepository(RecurringTransaction) : this;
    return repo.findOne({
      where: { id },
      relations: ['account', 'category'],
    });
  }

  /**
   * Quét các giao dịch định kỳ đến hạn chạy cho Cron Job
   */
  async findDueTransactions(currentDate: Date, manager?: EntityManager): Promise<RecurringTransaction[]> {
    const repo = manager ? manager.getRepository(RecurringTransaction) : this;
    return repo
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.account', 'account')
      .leftJoinAndSelect('rt.category', 'category')
      .where('rt.is_paused = :isPaused', { isPaused: false })
      .andWhere('rt.next_run_date <= :currentDate', { currentDate })
      .andWhere('rt.deleted_at IS NULL')
      .orderBy('rt.next_run_date', 'ASC')
      .getMany();
  }

  /**
   * Truy vấn phân trang danh sách lịch định kỳ theo ví và bộ lọc
   */
  async findPaged(
    walletIds: string[],
    query: RecurringTransactionQueryDto,
  ): Promise<[RecurringTransaction[], number]> {
    const qb = this.createQueryBuilder('rt')
      .leftJoinAndSelect('rt.account', 'account')
      .leftJoinAndSelect('rt.category', 'category')
      .where('rt.wallet_id IN (:...walletIds)', { walletIds })
      .andWhere('rt.deleted_at IS NULL');

    if (query.type) {
      qb.andWhere('rt.type = :type', { type: query.type });
    }

    if (query.isPaused !== undefined) {
      qb.andWhere('rt.is_paused = :isPaused', { isPaused: query.isPaused });
    }

    const skip = (query.page - 1) * query.limit;
    qb.orderBy('rt.created_at', 'DESC').skip(skip).take(query.limit);

    return qb.getManyAndCount();
  }

  /**
   * Lưu quy tắc (hỗ trợ transaction manager)
   */
  async saveRule(
    entity: Partial<RecurringTransaction>,
    manager?: EntityManager,
  ): Promise<RecurringTransaction> {
    const repo = manager ? manager.getRepository(RecurringTransaction) : this;
    return repo.save(entity);
  }
}