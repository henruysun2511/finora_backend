import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AccountRepository } from './repository/account.repository';
import { AccountBalanceAdjustmentRepository } from './repository/account-balance-adjustment.repository';
import { WalletsService } from '../wallets/wallets.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { AccountMapper } from './mapper/account.mapper';
import { CreateAccountDto } from './dto/request/create-account.dto';
import { UpdateAccountDto } from './dto/request/update-account.dto';
import { AccountQueryDto } from './dto/request/account-query.dto';
import { AdjustBalanceDto } from './dto/request/adjust-balance.dto';
import { AccountResponseDto } from './dto/response/account-response.dto';
import { PaginatedResponse } from '../../common/response/api-response';
import { ACCOUNT_WRITE_ROLES } from './accounts.constant';
import {
  AccountAccessDeniedException,
  AccountArchivedException,
  AccountCurrencyChangeNotAllowedException,
  AccountCurrencyMismatchWalletException,
  AccountHasTransactionsException,
  AccountInsufficientBalanceException,
  AccountNameAlreadyExistsException,
  AccountNotFoundException,
  AccountSameSourceAndDestinationException,
  AccountWalletNotFoundException,
  IdempotencyKeyRequiredException,
} from './exceptions/account.exception';
import { BalanceDirection } from '../../common/enums/balance-direction.enum';

type AccessMode = 'read' | 'write';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class AccountsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accountRepo: AccountRepository,
    private readonly adjustmentRepo: AccountBalanceAdjustmentRepository,
    private readonly walletsService: WalletsService,
    private readonly accountMapper: AccountMapper,
  ) {}

  // ---------------------------------------------------------------- helpers

  /** Ném lỗi nếu ví không tồn tại hoặc user không đủ quyền. Trả về Wallet entity. */
  private async assertWalletAccess(
    walletId: string,
    userId: string,
    mode: AccessMode,
  ): Promise<Wallet> {
    const wallet = await this.walletsService.findById(walletId);
    if (!wallet) throw new AccountWalletNotFoundException(walletId);

    const role = await this.walletsService.getMemberRole(walletId, userId);
    if (!role) throw new AccountAccessDeniedException(walletId);
    if (mode === 'write' && !ACCOUNT_WRITE_ROLES.includes(role)) {
      throw new AccountAccessDeniedException(walletId);
    }
    return wallet;
  }

  private async getAccountWithAccess(accountId: string, userId: string, mode: AccessMode) {
    const account = await this.accountRepo.findById(accountId);
    if (!account) throw new AccountNotFoundException(accountId);
    await this.assertWalletAccess(account.walletId, userId, mode);
    return account;
  }

  // ---------------------------------------------------------------- create

  async createAccount(userId: string, dto: CreateAccountDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existed = await this.accountRepo.findByIdempotencyKey(userId, idempotencyKey);
      if (existed) return this.accountMapper.toDetail(existed);
    }

    const wallet = await this.assertWalletAccess(dto.walletId, userId, 'write');

    // Rule: 1 Ví chỉ chứa các Tài khoản cùng loại tiền tệ
    const walletCurrency = (wallet.defaultCurrency ?? 'VND').toUpperCase();
    if (dto.currency && dto.currency.toUpperCase() !== walletCurrency) {
      throw new AccountCurrencyMismatchWalletException(
        dto.currency.toUpperCase(),
        walletCurrency,
      );
    }
    const resolvedCurrency = (dto.currency ?? walletCurrency).toUpperCase();

    const duplicated = await this.accountRepo.findByWalletAndName(dto.walletId, dto.name);
    if (duplicated) throw new AccountNameAlreadyExistsException(dto.name);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = this.accountRepo.create(
          this.accountMapper.toEntity(dto, userId, idempotencyKey, resolvedCurrency),
        );
        const saved = await this.accountRepo.save(account, manager);
        return this.accountMapper.toDetail(saved);
      });
    } catch (error: any) {
      // Gửi lặp song song: unique index idempotency chặn bản ghi thứ 2 -> trả bản đã tạo
      if (error?.code === '23505' && idempotencyKey) {
        const existed = await this.accountRepo.findByIdempotencyKey(userId, idempotencyKey);
        if (existed) return this.accountMapper.toDetail(existed);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------- read

  async listAccounts(
    userId: string,
    query: AccountQueryDto,
  ): Promise<PaginatedResponse<AccountResponseDto>> {
    let walletIds = await this.walletsService.getUserWalletIds(userId);

    if (query.walletId) {
      if (!walletIds.includes(query.walletId)) {
        throw new AccountAccessDeniedException(query.walletId);
      }
      walletIds = [query.walletId];
    }

    const [accounts, total] = await this.accountRepo.findPaged(query, walletIds);
    return PaginatedResponse.of(
      accounts.map((a) => this.accountMapper.toResponse(a)),
      total,
      query.page,
      query.limit,
    );
  }

  async getAccount(userId: string, accountId: string) {
    const account = await this.getAccountWithAccess(accountId, userId, 'read');
    return this.accountMapper.toDetail(account);
  }

  async getBalance(userId: string, accountId: string) {
    const account = await this.getAccountWithAccess(accountId, userId, 'read');
    return this.accountMapper.toBalance(account);
  }

  // ---------------------------------------------------------------- update

  async updateAccount(userId: string, accountId: string, dto: UpdateAccountDto) {
    return this.dataSource.transaction(async (manager) => {
      const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
      if (!account) throw new AccountNotFoundException(accountId);
      const wallet = await this.assertWalletAccess(account.walletId, userId, 'write');

      if (account.isArchived) throw new AccountArchivedException(accountId);

      if (dto.name !== undefined && dto.name.toLowerCase() !== account.name.toLowerCase()) {
        const duplicated = await this.accountRepo.findByWalletAndName(account.walletId, dto.name);
        if (duplicated && duplicated.id !== account.id) {
          throw new AccountNameAlreadyExistsException(dto.name);
        }
      }

      if (dto.currency !== undefined && dto.currency.toUpperCase() !== account.currency.toUpperCase()) {
        const walletCurrency = (wallet.defaultCurrency ?? 'VND').toUpperCase();
        if (dto.currency.toUpperCase() !== walletCurrency) {
          throw new AccountCurrencyMismatchWalletException(
            dto.currency.toUpperCase(),
            walletCurrency,
          );
        }

        const hasHistory = await this.accountRepo.hasFinancialHistory(account.id, manager);
        if (account.balance !== 0 || hasHistory) {
          throw new AccountCurrencyChangeNotAllowedException(accountId);
        }
        account.currency = dto.currency.toUpperCase();
      }

      if (dto.name !== undefined) account.name = dto.name;
      if (dto.type !== undefined) account.type = dto.type;
      if (dto.icon !== undefined) account.icon = dto.icon;
      if (dto.color !== undefined) account.color = dto.color;
      if (dto.accountNumberLast4 !== undefined) {
        account.accountNumberLast4 = dto.accountNumberLast4;
      }

      const saved = await this.accountRepo.save(account, manager);
      return this.accountMapper.toDetail(saved);
    });
  }

  // ---------------------------------------------------------------- delete

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Khóa dòng tài khoản: giao dịch đồng thời không chen vào giữa lúc kiểm tra và xóa
      const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
      if (!account) throw new AccountNotFoundException(accountId);
      await this.assertWalletAccess(account.walletId, userId, 'write');

      const hasHistory = await this.accountRepo.hasFinancialHistory(account.id, manager);
      if (hasHistory) throw new AccountHasTransactionsException(accountId);

      await this.accountRepo.softDelete(account.id, manager);
    });
  }

  // ---------------------------------------------------------------- archive

  archiveAccount(userId: string, accountId: string) {
    return this.changeArchiveState(userId, accountId, true);
  }

  unarchiveAccount(userId: string, accountId: string) {
    return this.changeArchiveState(userId, accountId, false);
  }

  private async changeArchiveState(userId: string, accountId: string, archive: boolean) {
    return this.dataSource.transaction(async (manager) => {
      const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
      if (!account) throw new AccountNotFoundException(accountId);
      await this.assertWalletAccess(account.walletId, userId, 'write');

      // Đã ở trạng thái đích -> idempotent, trả về nguyên trạng
      if (account.isArchived === archive) return this.accountMapper.toDetail(account);

      account.isArchived = archive;
      account.archivedAt = archive ? new Date() : null;
      const saved = await this.accountRepo.save(account, manager);
      return this.accountMapper.toDetail(saved);
    });
  }

  // ---------------------------------------------------------------- adjust balance

  async adjustBalance(
    userId: string,
    accountId: string,
    dto: AdjustBalanceDto,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) throw new IdempotencyKeyRequiredException();

    return this.dataSource.transaction(async (manager) => {
      const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
      if (!account) throw new AccountNotFoundException(accountId);
      await this.assertWalletAccess(account.walletId, userId, 'write');

      // Yêu cầu gửi lặp: trả kết quả đã xử lý, không ghi lần 2
      const existed = await this.adjustmentRepo.findByKey(accountId, idempotencyKey, manager);
      if (existed) return this.accountMapper.toAdjustmentResponse(existed, account.currency);

      if (account.isArchived) throw new AccountArchivedException(accountId);

      const delta = dto.direction === BalanceDirection.INCREASE ? dto.amount : -dto.amount;
      const balanceBefore = account.balance;
      const balanceAfter = round2(balanceBefore + delta);

      if (balanceAfter < 0) {
        throw new AccountInsufficientBalanceException(balanceBefore, dto.amount);
      }

      // Cập nhật số dư + ghi lịch sử trong cùng transaction, cùng manager
      account.balance = balanceAfter;
      await this.accountRepo.save(account, manager);

      const adjustment = this.adjustmentRepo.create({
        accountId: account.id,
        userId,
        direction: dto.direction,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        reason: dto.reason,
        idempotencyKey,
      });
      const saved = await this.adjustmentRepo.save(adjustment, manager);

      return this.accountMapper.toAdjustmentResponse(saved, account.currency);
    });
  }

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Tìm entity Account theo ID.
   * Dùng cho TransactionsService, TransfersService... kiểm tra tài khoản hợp lệ.
   *
   * @param id - UUID của tài khoản
   * @returns Account entity hoặc null nếu không tồn tại
   */
  async findById(id: string) {
    return this.accountRepo.findById(id);
  }

  /**
   * [CROSS-MODULE] Xác thực tính hợp lệ của tài khoản nguồn & đích cho giao dịch chuyển tiền.
   * Kiểm tra tồn tại, không trùng nhau, không bị lưu trữ, và user có quyền ghi trên cả 2 ví.
   *
   * @param userId - UUID của người dùng thực hiện
   * @param fromAccountId - UUID tài khoản nguồn
   * @param toAccountId - UUID tài khoản đích
   * @returns { fromAccount, toAccount }
   */
  async validateTransferAccounts(userId: string, fromAccountId: string, toAccountId: string) {
    if (fromAccountId === toAccountId) {
      throw new AccountSameSourceAndDestinationException(fromAccountId);
    }

    const fromAccount = await this.accountRepo.findById(fromAccountId);
    if (!fromAccount) throw new AccountNotFoundException(fromAccountId);

    const toAccount = await this.accountRepo.findById(toAccountId);
    if (!toAccount) throw new AccountNotFoundException(toAccountId);

    if (fromAccount.isArchived) throw new AccountArchivedException(fromAccountId);
    if (toAccount.isArchived) throw new AccountArchivedException(toAccountId);

    await this.assertWalletAccess(fromAccount.walletId, userId, 'write');
    await this.assertWalletAccess(toAccount.walletId, userId, 'write');

    return { fromAccount, toAccount };
  }

  /**
   * [CROSS-MODULE] Thực thi cập nhật số dư 2 tài khoản (và tài khoản phí nếu có) trong transaction.
   * Khóa dòng tài khoản theo thứ tự UUID tăng dần để ngăn ngừa hoàn toàn deadlock.
   *
   * @param params - Thông tin số tiền nguồn, đích và phí
   * @param manager - TypeORM EntityManager của transaction hiện tại
   */
  async executeTransferBalances(
    params: {
      fromAccountId: string;
      toAccountId: string;
      fromAmount: number;
      toAmount: number;
      fee?: number;
      feeAccountId?: string;
    },
    manager: EntityManager,
  ) {
    const { fromAccountId, toAccountId, fromAmount, toAmount, fee = 0, feeAccountId } = params;

    // Sắp xếp các ID theo thứ tự alphabet để tránh deadlock giữa 2 giao dịch song song
    const idsToLock = Array.from(
      new Set([fromAccountId, toAccountId, feeAccountId].filter(Boolean) as string[]),
    ).sort();

    const accountMap = new Map<string, any>();
    for (const id of idsToLock) {
      const acc = await this.accountRepo.findByIdForUpdate(id, manager);
      if (!acc) throw new AccountNotFoundException(id);
      if (acc.isArchived) throw new AccountArchivedException(id);
      accountMap.set(id, acc);
    }

    const fromAcc = accountMap.get(fromAccountId);
    const toAcc = accountMap.get(toAccountId);

    // Tính tổng số tiền bị trừ từ tài khoản nguồn
    const deductFromSource =
      feeAccountId && feeAccountId !== fromAccountId ? fromAmount : round2(fromAmount + fee);

    if (fromAcc.balance < deductFromSource) {
      throw new AccountInsufficientBalanceException(fromAcc.balance, deductFromSource);
    }

    // Nếu trừ phí từ tài khoản riêng biệt
    if (fee > 0 && feeAccountId && feeAccountId !== fromAccountId) {
      const feeAcc = accountMap.get(feeAccountId);
      if (feeAcc.balance < fee) {
        throw new AccountInsufficientBalanceException(feeAcc.balance, fee);
      }
      feeAcc.balance = round2(feeAcc.balance - fee);
      await this.accountRepo.save(feeAcc, manager);
    }

    fromAcc.balance = round2(fromAcc.balance - deductFromSource);
    toAcc.balance = round2(toAcc.balance + toAmount);

    await this.accountRepo.save(fromAcc, manager);
    await this.accountRepo.save(toAcc, manager);

    return {
      fromBalanceAfter: fromAcc.balance,
      toBalanceAfter: toAcc.balance,
    };
  }

  /**
   * [CROSS-MODULE] Lấy danh sách ID các tài khoản mà user có quyền truy cập (thông qua các ví của user).
   *
   * @param userId - UUID người dùng
   * @returns Danh sách account ID
   */
  async getUserAccessibleAccountIds(userId: string): Promise<string[]> {
    const walletIds = await this.walletsService.getUserWalletIds(userId);
    return this.accountRepo.findAccountIdsByWalletIds(walletIds);
  }
}