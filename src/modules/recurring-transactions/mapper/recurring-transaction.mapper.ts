import { Injectable } from '@nestjs/common';
import { RecurringTransaction } from '../entities/recurring-transaction.entity';
import { RecurringTransactionResponseDto } from '../dto/response/recurring-transaction-response.dto';
import { RecurringTransactionDetailResponseDto, ExecutionHistoryItemDto } from '../dto/response/recurring-transaction-detail-response.dto';
import { CreateRecurringTransactionDto } from '../dto/request/create-recurring-transaction.dto';
import { RecurrencePeriod } from '../enums/recurrence-period.enum';

@Injectable()
export class RecurringTransactionMapper {
  toResponse(entity: RecurringTransaction): RecurringTransactionResponseDto {
    return {
      id: entity.id,
      name: (entity as any).name ?? '', // Ánh xạ nếu entity có thuộc tính name
      type: entity.type,
      amount: Number(entity.amount),
      currency: (entity as any).currency ?? 'VND',
      frequency: entity.frequency.toLowerCase() as RecurrencePeriod,
      accountName: entity.account?.name,
      category: entity.category
        ? {
            id: entity.category.id,
            name: entity.category.name,
            icon: (entity.category as any).icon,
          }
        : undefined,
        nextRunDate: new Date(entity.nextRunDate),
        endDate: (entity as any).endDate ?? null,
        isPaused: !entity.isActive, // Đảo ngược isActive thành isPaused cho phù hợp với API response tiêu chuẩn
        createdAt: entity.createdAt,
    };
  }

  toDetailResponse(
    entity: RecurringTransaction,
    historyTransactions: any[] = [],
  ): RecurringTransactionDetailResponseDto {
    const base = this.toResponse(entity);
    
    let totalAmountSpent = 0;
    const executionHistory: ExecutionHistoryItemDto[] = historyTransactions.map((tx) => {
      const amt = Number(tx.amount);
      totalAmountSpent += amt;
      return {
        transactionId: tx.id,
        amount: amt,
        date: tx.transactionDate ?? tx.createdAt,
      };
    });

    return {
      ...base,
      totalExecutedTimes: executionHistory.length,
      totalAmountSpent,
      executionHistory,
    };
  }

  toEntity(dto: CreateRecurringTransactionDto, nextRunDate: Date): Partial<RecurringTransaction> {
    return {
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      amount: dto.amount,
      frequency: dto.frequency,
      // Chuyển Date object sang định dạng chuỗi YYYY-MM-DD phù hợp với cột type: 'date' trong Entity
      nextRunDate: nextRunDate.toISOString().split('T')[0],
      isActive: true,
      // Các thuộc tính mở rộng nếu cần lưu kèm
      ...( {
        name: dto.name,
        currency: dto.currency ?? 'VND',
        walletId: dto.walletId,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      } as any ),
    };
  }
}