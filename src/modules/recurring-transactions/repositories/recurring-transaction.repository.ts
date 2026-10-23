import { Injectable } from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
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
  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<RecurringTransaction | null> {
    const repo = manager ? manager.getRepository(RecurringTransaction) : this;
    return repo.findOne({
      where: { id },
      relations: ['account', 'category'],
    });
  }

  /**
   * Quét các giao dịch định kỳ đến hạn chạy cho Cron Job
   */
  async findDueTransactions(
    currentDate: Date,
    manager?: EntityManager,
  ): Promise<RecurringTransaction[]> {
    const repo = manager ? manager.getRepository(RecurringTransaction) : this;
    return repo
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.account', 'account')
      .leftJoinAndSelect('rt.category', 'category')
      .where('rt.isPaused = :isPaused', { isPaused: false })
      .andWhere('rt.nextRunDate <= :currentDate', { currentDate })
      .andWhere('rt.deletedAt IS NULL')
      .orderBy('rt.nextRunDate', 'ASC')
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
      .where('rt.walletId IN (:...walletIds)', { walletIds })
      .andWhere('rt.deletedAt IS NULL');

    if (query.type) {
      qb.andWhere('rt.type = :type', { type: query.type });
    }

    if (query.isPaused !== undefined) {
      qb.andWhere('rt.isPaused = :isPaused', { isPaused: query.isPaused });
    }

    const skip = (query.page - 1) * query.limit;
    qb.orderBy('rt.createdAt', 'DESC').skip(skip).take(query.limit);

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
