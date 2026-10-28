// src/modules/transfers/transfers.service.ts
import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { TransferRepository } from './repositories/transfer.repository';
import { AccountsService } from '../accounts/accounts.service';
import { SettingsService } from '../settings/settings.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { TransferMapper } from './mapper/transfer.mapper';
import { CreateTransferDto } from './dto/request/create-transfer.dto';
import { ConvertCurrencyDto } from './dto/request/convert-currency.dto';
import { TransferQueryDto } from './dto/request/transfer-query.dto';
import { TransferResponseDto } from './dto/response/transfer-response.dto';
import { ConvertPreviewResponseDto } from './dto/response/convert-preview-response.dto';
import { PaginatedResponse } from '../../common/response/api-response';
import {
  TransferAccessDeniedException,
  TransferNotFoundException,
} from './exceptions/transfer.exception';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';
import {
  EVENT_NET_WORTH_CHANGED,
  NetWorthChangedEvent,
} from '../../common/events/net-worth-changed.event';
import {
  EVENT_WALLET_BALANCE_UPDATED,
  WalletBalanceUpdatedEvent,
} from '../wallets/events/wallet-balance-updated.event';

@Injectable()
export class TransfersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transferRepo: TransferRepository,
    private readonly accountsService: AccountsService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly settingsService: SettingsService,
    private readonly mapper: TransferMapper,
    private readonly auditLogsService: AuditLogsService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Tạo giao dịch chuyển tiền giữa 2 tài khoản (cùng loại hoặc khác loại tiền tệ).
   *
   * @param userId - UUID của người dùng thực hiện
   * @param dto - Thông tin giao dịch chuyển tiền
   * @returns TransferResponseDto
   */
  async createTransfer(userId: string, dto: CreateTransferDto): Promise<TransferResponseDto> {
    // 0. Xác thực mã PIN bảo mật nếu người dùng bật cấu hình bảo vệ giao dịch
    await this.settingsService.verifyActionPin(userId, dto.pin);

    // 1. Kiểm tra tính hợp lệ và quyền hạn của 2 tài khoản nguồn & đích
    const { fromAccount, toAccount } = await this.accountsService.validateTransferAccounts(
      userId,
      dto.fromAccountId,
      dto.toAccountId,
    );

    // 2. Tính toán tỷ giá và số tiền nhận được ở tài khoản đích
    let exchangeRate = 1;
    let toAmount = dto.amount;

    if (fromAccount.currency.toUpperCase() !== toAccount.currency.toUpperCase()) {
      const fx = await this.exchangeRatesService.convert(
        dto.amount,
        fromAccount.currency,
        toAccount.currency,
      );
      exchangeRate = fx.rate;
      toAmount = fx.convertedAmount;
    }

    // 3. Thực thi cập nhật số dư và lưu giao dịch trong 1 database transaction ACID
    const result = await this.dataSource.transaction(async (manager) => {
      await this.accountsService.executeTransferBalances(
        {
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          fromAmount: dto.amount,
          toAmount,
          fee: dto.fee ?? 0,
          feeAccountId: dto.feeAccountId,
        },
        manager,
      );

      const transfer = this.transferRepo.create({
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        createdBy: userId,
        feeAccountId: dto.feeAccountId ?? null,
        fee: dto.fee ?? 0,
        fromAmount: dto.amount,
        fromCurrency: fromAccount.currency,
        toAmount,
        toCurrency: toAccount.currency,
        exchangeRate,
        note: dto.note ?? null,
        transferDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
      });

      const saved = await this.transferRepo.save(transfer, manager);
      saved.fromAccount = fromAccount;
      saved.toAccount = toAccount;

      return this.mapper.toResponse(saved);
    });

    this.auditLogsService.recordLog({
      userId,
      walletId: fromAccount.walletId,
      action: AUDIT_LOG_ACTION.CREATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.TRANSFER,
      entityId: result.id,
      newValue: {
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        fromCurrency: fromAccount.currency,
        toAmount,
        toCurrency: toAccount.currency,
        fee: dto.fee ?? 0,
        feeAccountId: dto.feeAccountId,
        note: dto.note,
        transferDate: result.transferDate,
      },
    });
    if (this.eventEmitter) {
      this.eventEmitter.emit(
        EVENT_NET_WORTH_CHANGED,
        new NetWorthChangedEvent(userId, 'transfer.create'),
      );
      try {
        const fromAccUpdated = await this.accountsService.findById(dto.fromAccountId);
        const toAccUpdated = await this.accountsService.findById(dto.toAccountId);
        this.eventEmitter.emit(
          EVENT_WALLET_BALANCE_UPDATED,
          new WalletBalanceUpdatedEvent(
            fromAccount.walletId,
            dto.fromAccountId,
            result.id,
            'expense',
            dto.amount,
            userId,
            fromAccUpdated?.balance ?? fromAccount.balance - dto.amount,
            'Chuyển tiền',
            dto.note ?? `Chuyển tiền đến ${toAccount.name}`,
          ),
        );
        this.eventEmitter.emit(
          EVENT_WALLET_BALANCE_UPDATED,
          new WalletBalanceUpdatedEvent(
            toAccount.walletId,
            dto.toAccountId,
            result.id,
            'income',
            toAmount,
            userId,
            toAccUpdated?.balance ?? toAccount.balance + toAmount,
            'Chuyển tiền',
            dto.note ?? `Nhận tiền từ ${fromAccount.name}`,
          ),
        );
      } catch {
        // Safe fallback
      }
    }

    return result;
  }

  /**
   * Preview tính toán quy đổi tiền tệ và xem tỷ giá trước khi xác nhận chuyển tiền.
   *
   * @param userId - UUID của người dùng
   * @param dto - Thông tin tài khoản và số tiền cần quy đổi
   * @returns ConvertPreviewResponseDto
   */
  async convertPreview(userId: string, dto: ConvertCurrencyDto): Promise<ConvertPreviewResponseDto> {
    const { fromAccount, toAccount } = await this.accountsService.validateTransferAccounts(
      userId,
      dto.fromAccountId,
      dto.toAccountId,
    );

    if (fromAccount.currency.toUpperCase() === toAccount.currency.toUpperCase()) {
      return this.mapper.toConvertPreview(fromAccount, toAccount, dto.amount, dto.amount, {
        from: fromAccount.currency,
        to: toAccount.currency,
        rate: 1,
        inverseRate: 1,
        updatedAt: new Date(),
        source: 'live',
        isEstimated: false,
      });
    }

    const fx = await this.exchangeRatesService.convert(
      dto.amount,
      fromAccount.currency,
      toAccount.currency,
    );

    return this.mapper.toConvertPreview(
      fromAccount,
      toAccount,
      dto.amount,
      fx.convertedAmount,
      fx,
    );
  }

  /**
   * Lấy danh sách lịch sử chuyển tiền có phân trang.
   *
   * @param userId - UUID của người dùng
   * @param query - Bộ lọc phân trang, tài khoản và thời gian
   * @returns PaginatedResponse<TransferResponseDto>
   */
  async getTransfers(
    userId: string,
    query: TransferQueryDto,
  ): Promise<PaginatedResponse<TransferResponseDto>> {
    const accessibleAccountIds = await this.accountsService.getUserAccessibleAccountIds(userId);
    const [transfers, total] = await this.transferRepo.findPaged(query, accessibleAccountIds);

    return PaginatedResponse.of(
      transfers.map((t) => this.mapper.toResponse(t)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Xem chi tiết một giao dịch chuyển tiền.
   *
   * @param userId - UUID của người dùng
   * @param id - UUID của giao dịch chuyển tiền
   * @returns TransferResponseDto
   */
  async getTransferById(userId: string, id: string): Promise<TransferResponseDto> {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer) {
      throw new TransferNotFoundException(id);
    }

    const accessibleAccountIds = await this.accountsService.getUserAccessibleAccountIds(userId);
    const hasAccess =
      accessibleAccountIds.includes(transfer.fromAccountId) ||
      accessibleAccountIds.includes(transfer.toAccountId);

    if (!hasAccess) {
      throw new TransferAccessDeniedException(id);
    }

    return this.mapper.toResponse(transfer);
  }
}
