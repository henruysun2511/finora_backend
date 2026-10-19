import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RecurringTransactionRepository } from './repositories/recurring-transaction.repository';
import { RecurringTransactionMapper } from './mapper/recurring-transaction.mapper';
import { CreateRecurringTransactionDto } from './dto/request/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/request/update-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from './dto/request/recurring-transaction-query.dto';
import { RecurrenceDateCalculator } from './utils/recurrence-date-calculator.util';
import { 
  RecurringTransactionNotFoundException, 
  InvalidRecurrenceDateException 
} from './exceptions/recurring-transaction.exception';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionsService } from '../transactions/transactions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { PaginatedResponse } from '../../common/response/api-response';
import { RecurringTransactionResponseDto } from './dto/response/recurring-transaction-response.dto';
import { RecurringTransactionDetailResponseDto } from './dto/response/recurring-transaction-detail-response.dto';
import { TransactionResponseDto } from '../transactions/dto/response/transaction-response.dto';

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly recurringRepo: RecurringTransactionRepository,
    private readonly mapper: RecurringTransactionMapper,
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertWalletAccess(walletId: string, userId: string): Promise<void> {
    const userWalletIds = await this.walletsService.getUserWalletIds(userId);
    if (!userWalletIds.includes(walletId)) {
      throw new RecurringTransactionNotFoundException();
    }
  }

  // API 1: Lấy danh sách lịch định kỳ
  async listRules(userId: string, query: RecurringTransactionQueryDto): Promise<PaginatedResponse<RecurringTransactionResponseDto>> {
    let walletIds = await this.walletsService.getUserWalletIds(userId);
    if (query.walletId) {
      if (!walletIds.includes(query.walletId)) {
        throw new RecurringTransactionNotFoundException();
      }
      walletIds = [query.walletId];
    }

    const [items, total] = await this.recurringRepo.findPaged(walletIds, query);
    return PaginatedResponse.of(
      items.map((i) => this.mapper.toResponse(i)),
      total,
      query.page,
      query.limit,
    );
  }

  // API 2: Tạo quy tắc định kỳ mới
  async createRule(userId: string, dto: CreateRecurringTransactionDto): Promise<RecurringTransactionResponseDto> {
    await this.assertWalletAccess(dto.walletId, userId);

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate <= startDate) {
      throw new InvalidRecurrenceDateException('Ngày kết thúc phải lớn hơn ngày bắt đầu');
    }

    let nextRunDate = new Date(startDate);

    return this.dataSource.transaction(async (manager) => {
      const entityData = this.mapper.toEntity(dto, nextRunDate);
      const entity = this.recurringRepo.create(entityData);
      const saved = await this.recurringRepo.saveRule(entity, manager);

      if (dto.executeImmediately) {
        await this.transactionsService.createTransaction(
          userId,
          {
            accountId: dto.accountId,
            categoryId: dto.categoryId,
            type: dto.type,
            amount: dto.amount,
            note: `[Định kỳ] ${dto.name}`,
            transactionDate: new Date(),
          },
          manager,
          saved.id,
        );
        nextRunDate = RecurrenceDateCalculator.calculateNextRunDate(startDate, dto.frequency);
        saved.nextRunDate = nextRunDate.toISOString().split('T')[0];
        await this.recurringRepo.saveRule(saved, manager);
      }

      return this.mapper.toResponse(saved);
    });
  }

  // API 3: Thực thi ngay hôm nay (Execute Now)
  async executeNow(userId: string, id: string): Promise<TransactionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const rule = await this.recurringRepo.findById(id, manager);
      if (!rule) throw new RecurringTransactionNotFoundException(id);
      await this.assertWalletAccess(rule.account.walletId, userId);

      const tx = await this.transactionsService.createTransaction(
        userId,
        {
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: Number(rule.amount),
          note: `[Định kỳ] ${(rule as any).name}`,
          transactionDate: new Date(),
        },
        manager,
        rule.id,
      );

      const currentNextRun = new Date(rule.nextRunDate);
      let nextRun = RecurrenceDateCalculator.calculateNextRunDate(
        currentNextRun,
        rule.frequency.toUpperCase() as Parameters<typeof RecurrenceDateCalculator.calculateNextRunDate>[1],
      );
      
      const ruleEndDate = (rule as any).endDate ? new Date((rule as any).endDate) : null;
      if (ruleEndDate && nextRun > ruleEndDate) {
        rule.isActive = false; // Tự động dừng nếu vượt quá ngày kết thúc
      }
      rule.nextRunDate = nextRun.toISOString().split('T')[0];
      await this.recurringRepo.saveRule(rule, manager);

      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.RECURRING_EXECUTED,
        title: 'Giao dịch định kỳ đã thực thi',
        body: `Đã tự động ghi nhận giao dịch "${(rule as any).name}" số tiền ${rule.amount}`,
        relatedEntityType: 'TRANSACTION',
        relatedEntityId: tx.id,
      });

      return tx;
    });
  }

  // API 4: Chi tiết quy tắc & Lịch sử con
  async getRuleDetail(userId: string, id: string): Promise<RecurringTransactionDetailResponseDto> {
    const rule = await this.recurringRepo.findById(id);
    if (!rule) throw new RecurringTransactionNotFoundException(id);
    await this.assertWalletAccess(rule.account.walletId, userId);

    const history = await this.transactionsService.findByRecurringId(rule.id);
    return this.mapper.toDetailResponse(rule, history);
  }

  // API 5: Sửa quy tắc định kỳ
  async updateRule(userId: string, id: string, dto: UpdateRecurringTransactionDto): Promise<RecurringTransactionResponseDto> {
    const rule = await this.recurringRepo.findById(id);
    if (!rule) throw new RecurringTransactionNotFoundException(id);
    await this.assertWalletAccess(dto.walletId ?? rule.account.walletId, userId);

    if (dto.name !== undefined) (rule as any).name = dto.name;
    if (dto.amount !== undefined) rule.amount = dto.amount;
    if (dto.frequency !== undefined) {
      rule.frequency = dto.frequency.toLowerCase() as typeof rule.frequency;
    }
    if (dto.accountId !== undefined) rule.accountId = dto.accountId;
    if (dto.categoryId !== undefined) rule.categoryId = dto.categoryId;
    if (dto.endDate !== undefined) {
      (rule as any).endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    const saved = await this.recurringRepo.saveRule(rule);
    return this.mapper.toResponse(saved);
  }

  // API 6: Tạm dừng / Tiếp tục (Toggle isActive)
  async togglePause(userId: string, id: string): Promise<{ isPaused: boolean }> {
    const rule = await this.recurringRepo.findById(id);
    if (!rule) throw new RecurringTransactionNotFoundException(id);
    await this.assertWalletAccess(rule.account.walletId, userId);

    rule.isActive = !rule.isActive;
    if (rule.isActive && new Date(rule.nextRunDate) < new Date()) {
      rule.nextRunDate = new Date().toISOString().split('T')[0];
    }

    await this.recurringRepo.saveRule(rule);
    return { isPaused: !rule.isActive };
  }

  // API 7: Xóa quy tắc định kỳ
  async deleteRule(userId: string, id: string): Promise<void> {
    const rule = await this.recurringRepo.findById(id);
    if (!rule) throw new RecurringTransactionNotFoundException(id);
    await this.assertWalletAccess(rule.account.walletId, userId);

    await this.recurringRepo.softDelete(rule.id);
  }

  // Cron Job Batch Processing Worker
  async processDueRecurringTransactions(): Promise<void> {
    this.logger.log('Bắt đầu quét các giao dịch định kỳ đến hạn...');
    const today = new Date();
    const dueRules = await this.recurringRepo.findDueTransactions(today);

    for (const rule of dueRules) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const userId = rule.account.createdBy;
          if (!userId) {
            throw new Error(`Không tìm thấy người tạo tài khoản cho quy tắc ${rule.id}`);
          }

          await this.transactionsService.createTransaction(
            userId,
            {
              accountId: rule.accountId,
              categoryId: rule.categoryId,
              type: rule.type,
              amount: Number(rule.amount),
              note: `[Định kỳ] ${(rule as any).name}`,
              transactionDate: new Date(),
            },
            manager,
            rule.id,
          );

          const currentNextRun = new Date(rule.nextRunDate);
          let nextRun = RecurrenceDateCalculator.calculateNextRunDate(
            currentNextRun,
            rule.frequency.toUpperCase() as Parameters<typeof RecurrenceDateCalculator.calculateNextRunDate>[1],
          );
          
          const ruleEndDate = (rule as any).endDate ? new Date((rule as any).endDate) : null;
          if (ruleEndDate && nextRun > ruleEndDate) {
            rule.isActive = false;
          }
          rule.nextRunDate = nextRun.toISOString().split('T')[0];
          await this.recurringRepo.saveRule(rule, manager);
        });

        this.logger.log(`Đã thực thi thành công quy tắc định kỳ ID: ${rule.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Lỗi thực thi quy tắc định kỳ ID ${rule.id}: ${message}`);
      }
    }
  }
}