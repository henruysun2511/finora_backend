import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/request/create-transaction.dto';
import { TransactionResponseDto } from '../dto/response/transaction-response.dto';
import { TransactionSource } from '../enums/transaction-source.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';
import { PhotoType } from '../enums/photo-type.enum';

@Injectable()
export class TransactionMapper {
  toEntity(
    dto: CreateTransactionDto,
    createdBy: string,
    currency: string,
    fallbackName: string,
  ): Partial<Transaction> {
    return {
      accountId: dto.accountId,
      createdBy,
      categoryId: dto.categoryId,
      type: dto.type,
      amount: dto.amount,
      currency: currency.toUpperCase(),
      name: (dto.name && dto.name.trim()) ? dto.name.trim() : fallbackName,
      note: dto.note ?? null,
      source: dto.source ?? TransactionSource.MANUAL,
      status: TransactionStatus.CONFIRMED,
      visibility: dto.visibility ?? TransactionVisibility.PRIVATE,
      amountHidden: dto.amountHidden ?? false,
      excludeFromReport: dto.excludeFromReport ?? false,
      locationName: dto.locationName ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      photoUrl: dto.photoUrl ?? null,
      photoType: dto.photoType ?? (dto.photoUrl ? PhotoType.RECEIPT : null),
      transactionDate: dto.transactionDate ?? new Date(),
    };
  }

  toResponse(entity: Transaction, balanceAfter?: number): TransactionResponseDto {
    return {
      id: entity.id,
      accountId: entity.accountId,
      accountName: entity.account?.name,
      createdBy: entity.createdBy,
      categoryId: entity.categoryId,
      categoryName: entity.category?.name,
      categoryIcon: entity.category?.icon,
      categoryColor: entity.category?.color,
      type: entity.type,
      amount: entity.amount,
      currency: entity.currency,
      name: entity.name,
      note: entity.note,
      source: entity.source,
      status: entity.status,
      visibility: entity.visibility,
      amountHidden: entity.amountHidden,
      excludeFromReport: entity.excludeFromReport,
      locationName: entity.locationName,
      latitude: entity.latitude,
      longitude: entity.longitude,
      photoUrl: entity.photoUrl ?? null,
      photoType: entity.photoType ?? null,
      balanceAfter,
      transactionDate: entity.transactionDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
