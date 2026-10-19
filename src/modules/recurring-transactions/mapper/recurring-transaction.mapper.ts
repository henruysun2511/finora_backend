import { Injectable } from '@nestjs/common';
import { RecurringTransaction } from '../entities/recurring-transaction.entity';
import { RecurringTransactionResponseDto } from '../dto/response/recurring-transaction-response.dto';
import {
  RecurringTransactionDetailResponseDto,
  ExecutionHistoryItemDto,
} from '../dto/response/recurring-transaction-detail-response.dto';
import { CreateRecurringTransactionDto } from '../dto/request/create-recurring-transaction.dto';

@Injectable()
export class RecurringTransactionMapper {
  toResponse(entity: RecurringTransaction): RecurringTransactionResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      amount: Number(entity.amount),
      currency: entity.currency ?? 'VND',
      frequency: entity.frequency,
      accountName: entity.account?.name,
      category: entity.category
        ? {
            id: entity.category.id,
            name: entity.category.name,
            icon: entity.category.icon,
          }
        : undefined,
      nextRunDate: new Date(entity.nextRunDate),
      endDate: entity.endDate ? new Date(entity.endDate) : null,
      isPaused: entity.isPaused,
      createdAt: entity.createdAt,
    };
  }

  toDetailResponse(
    entity: RecurringTransaction,
    historyTransactions: any[] = [],
  ): RecurringTransactionDetailResponseDto {
    const base = this.toResponse(entity);

    let totalAmountSpent = 0;
    const executionHistory: ExecutionHistoryItemDto[] = historyTransactions.map(
      (tx) => {
        const amt = Number(tx.amount);
        totalAmountSpent += amt;
        return {
          transactionId: tx.id,
          amount: amt,
          date: tx.transactionDate ?? tx.createdAt,
        };
      },
    );

    return {
      ...base,
      totalExecutedTimes: executionHistory.length,
      totalAmountSpent,
      executionHistory,
    };
  }

  toEntity(
    dto: CreateRecurringTransactionDto,
    nextRunDate: Date,
    userId: string,
  ): Partial<RecurringTransaction> {
    return {
      walletId: dto.walletId,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      createdBy: userId,
      name: dto.name,
      amount: dto.amount,
      currency: dto.currency ?? 'VND',
      type: dto.type,
      frequency: dto.frequency,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      nextRunDate,
      isPaused: false,
    };
  }
}
