// src/modules/accounts/mapper/account.mapper.ts
import { Injectable } from '@nestjs/common';
import { Account } from '../entities/account.entity';
import { AccountBalanceAdjustment } from '../entities/account-balance-adjustment.entity';
import { CreateAccountDto } from '../dto/request/create-account.dto';
import { AccountDetailDto, AccountResponseDto } from '../dto/response/account-response.dto';
import { AccountBalanceResponseDto } from '../dto/response/account-balance-response.dto';
import { BalanceAdjustmentResponseDto } from '../dto/response/balance-adjustment-response.dto';

@Injectable()
export class AccountMapper {
  toEntity(
    dto: CreateAccountDto,
    userId: string,
    idempotencyKey?: string,
    currency?: string,
  ): Partial<Account> {
    const initial = dto.initialBalance ?? 0;
    return {
      walletId: dto.walletId,
      name: dto.name,
      type: dto.type,
      currency: currency ?? dto.currency ?? 'VND',
      balance: initial,
      initialBalance: initial,
      accountNumberLast4: dto.accountNumberLast4 ?? null,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
      isArchived: false,
      archivedAt: null,
      createdBy: userId,
      idempotencyKey: idempotencyKey ?? null,
    };
  }

  toResponse(a: Account): AccountResponseDto {
    return {
      id: a.id,
      walletId: a.walletId,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: a.balance,
      isArchived: a.isArchived,
      accountNumberLast4: a.accountNumberLast4 ?? null,
      icon: a.icon ?? null,
      color: a.color ?? null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  toDetail(a: Account): AccountDetailDto {
    return {
      ...this.toResponse(a),
      initialBalance: a.initialBalance,
      archivedAt: a.archivedAt ?? null,
      createdBy: a.createdBy ?? null,
    };
  }

  toBalance(a: Account): AccountBalanceResponseDto {
    return {
      accountId: a.id,
      balance: a.balance,
      currency: a.currency,
      isArchived: a.isArchived,
      asOf: new Date(),
    };
  }

  toAdjustmentResponse(
    adj: AccountBalanceAdjustment,
    currency: string,
  ): BalanceAdjustmentResponseDto {
    return {
      id: adj.id,
      accountId: adj.accountId,
      direction: adj.direction,
      amount: adj.amount,
      balanceBefore: adj.balanceBefore,
      balanceAfter: adj.balanceAfter,
      currency,
      reason: adj.reason,
      createdBy: adj.userId,
      createdAt: adj.createdAt,
    };
  }
}