import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ExpenseSplit } from '../entities/expense-split.entity';
import { SplitParticipant } from '../entities/split-participant.entity';
import { SplitQueryDto } from '../dto/request/split-query.dto';
import { ParticipantStatus } from '../enums/participant-status.enum';
import { SplitStatus } from '../enums/split-status.enum';
import { MySplitsSummaryResponseDto } from '../dto/response/my-splits-summary-response.dto';

@Injectable()
export class ExpenseSplitRepository {
  constructor(
    @InjectRepository(ExpenseSplit)
    private readonly repo: Repository<ExpenseSplit>,
    @InjectRepository(SplitParticipant)
    private readonly participantRepo: Repository<SplitParticipant>,
  ) {}

  create(data: Partial<ExpenseSplit>): ExpenseSplit {
    return this.repo.create(data);
  }

  save(split: ExpenseSplit, manager?: EntityManager): Promise<ExpenseSplit> {
    if (manager) {
      return manager.save(ExpenseSplit, split);
    }
    return this.repo.save(split);
  }

  findById(id: string, manager?: EntityManager): Promise<ExpenseSplit | null> {
    const repository = manager ? manager.getRepository(ExpenseSplit) : this.repo;
    return repository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'participants',
        'participants.user',
        'transaction',
        'wallet',
      ],
    });
  }

  findByTransactionId(
    transactionId: string,
    manager?: EntityManager,
  ): Promise<ExpenseSplit | null> {
    const repository = manager ? manager.getRepository(ExpenseSplit) : this.repo;
    return repository.findOne({
      where: { transactionId },
      relations: [
        'createdBy',
        'participants',
        'participants.user',
        'transaction',
        'wallet',
      ],
    });
  }

  async findMySplits(
    userId: string,
    query: SplitQueryDto,
  ): Promise<[ExpenseSplit[], number]> {
    const { page = 1, limit = 20, status, role } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('split')
      .leftJoinAndSelect('split.createdBy', 'createdBy')
      .leftJoinAndSelect('split.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('split.transaction', 'transaction')
      .leftJoinAndSelect('split.wallet', 'wallet')
      .where('split.deletedAt IS NULL');

    if (role === 'owner') {
      qb.andWhere('split.createdById = :userId', { userId });
    } else if (role === 'participant') {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM split_participants sp WHERE sp.split_id = split.id AND sp.user_id = :userId AND sp.deleted_at IS NULL)',
        { userId },
      );
      qb.andWhere('split.createdById != :userId', { userId });
    } else {
      // all
      qb.andWhere(
        '(split.createdById = :userId OR EXISTS (SELECT 1 FROM split_participants sp WHERE sp.split_id = split.id AND sp.user_id = :userId AND sp.deleted_at IS NULL))',
        { userId },
      );
    }

    if (status) {
      qb.andWhere('split.status = :status', { status });
    }

    qb.orderBy('split.createdAt', 'DESC').skip(skip).take(limit);

    return qb.getManyAndCount();
  }

  async getSummary(userId: string): Promise<MySplitsSummaryResponseDto> {
    // 1. Số yêu cầu pending gửi đến user này
    const pendingRequestsCount = await this.participantRepo
      .createQueryBuilder('sp')
      .innerJoin('sp.split', 'split')
      .where('sp.userId = :userId', { userId })
      .andWhere('sp.deletedAt IS NULL')
      .andWhere('sp.status = :status', { status: ParticipantStatus.PENDING })
      .andWhere('split.deletedAt IS NULL')
      .andWhere('split.createdById != :userId', { userId })
      .andWhere('split.status IN (:...activeStatuses)', {
        activeStatuses: [SplitStatus.PENDING, SplitStatus.ALL_ACCEPTED],
      })
      .getCount();

    // 2. Tổng số tiền người khác đang nợ mình qua các phiên CONFIRMED chưa settle
    const owedToMeResult = await this.participantRepo
      .createQueryBuilder('sp')
      .innerJoin('sp.split', 'split')
      .select('SUM(sp.assignedAmount)', 'total')
      .where('split.createdById = :userId', { userId })
      .andWhere('sp.userId != :userId', { userId })
      .andWhere('split.status = :confirmedStatus', { confirmedStatus: SplitStatus.CONFIRMED })
      .andWhere('sp.isSettled = false')
      .andWhere('sp.deletedAt IS NULL')
      .andWhere('split.deletedAt IS NULL')
      .getRawOne();

    const totalOwedToMe = Number(owedToMeResult?.total || 0);

    // 3. Tổng số tiền mình đang nợ người khác qua các phiên CONFIRMED chưa settle
    const iOweResult = await this.participantRepo
      .createQueryBuilder('sp')
      .innerJoin('sp.split', 'split')
      .select('SUM(sp.assignedAmount)', 'total')
      .where('sp.userId = :userId', { userId })
      .andWhere('split.createdById != :userId', { userId })
      .andWhere('split.status = :confirmedStatus', { confirmedStatus: SplitStatus.CONFIRMED })
      .andWhere('sp.isSettled = false')
      .andWhere('sp.deletedAt IS NULL')
      .andWhere('split.deletedAt IS NULL')
      .getRawOne();

    const totalIOwe = Number(iOweResult?.total || 0);

    return {
      pendingRequestsCount,
      totalOwedToMe,
      totalIOwe,
    };
  }
}
