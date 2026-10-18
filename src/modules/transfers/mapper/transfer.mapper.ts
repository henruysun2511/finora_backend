// src/modules/transfers/mapper/transfer.mapper.ts
import { Injectable } from '@nestjs/common';
import { Transfer } from '../entities/transfer.entity';
import { TransferResponseDto } from '../dto/response/transfer-response.dto';
import { ConvertPreviewResponseDto } from '../dto/response/convert-preview-response.dto';
import { Account } from '../../accounts/entities/account.entity';
import { ExchangeRateResponseDto } from '../../exchange-rates/dto/response/exchange-rate-response.dto';

@Injectable()
export class TransferMapper {
  toResponse(t: Transfer): TransferResponseDto {
    return {
      id: t.id,
      fromAccountId: t.fromAccountId,
      fromAccount: t.fromAccount
        ? {
            id: t.fromAccount.id,
            name: t.fromAccount.name,
            currency: t.fromAccount.currency,
          }
        : undefined,
      toAccountId: t.toAccountId,
      toAccount: t.toAccount
        ? {
            id: t.toAccount.id,
            name: t.toAccount.name,
            currency: t.toAccount.currency,
          }
        : undefined,
      fromAmount: t.fromAmount,
      fromCurrency: t.fromCurrency,
      toAmount: t.toAmount,
      toCurrency: t.toCurrency,
      exchangeRate: t.exchangeRate,
      fee: t.fee,
      feeAccountId: t.feeAccountId ?? null,
      note: t.note ?? null,
      transferDate: t.transferDate,
      createdAt: t.createdAt,
    };
  }

  toConvertPreview(
    fromAccount: Account,
    toAccount: Account,
    fromAmount: number,
    toAmount: number,
    fx: ExchangeRateResponseDto,
  ): ConvertPreviewResponseDto {
    return {
      fromAccountId: fromAccount.id,
      fromAccountName: fromAccount.name,
      fromCurrency: fromAccount.currency,
      fromAmount,
      toAccountId: toAccount.id,
      toAccountName: toAccount.name,
      toCurrency: toAccount.currency,
      toAmount,
      exchangeRate: fx.rate,
      inverseRate: fx.inverseRate,
      isEstimated: fx.isEstimated,
      rateSource: fx.source,
    };
  }
}
