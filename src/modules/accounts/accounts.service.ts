import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { AccountRepository } from './repositories/account.repository';
import { AccountBalanceAdjustmentRepository } from './repositories/account-balance-adjustment.repository';
import { WalletsService } from '../wallets/wallets.service';
import { SettingsService } from '../settings/settings.service';
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
import { BalanceDirection } from '../../modules/accounts/enums/balance-direction.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { Account } from './entities/account.entity';
import {
  EVENT_NET_WORTH_CHANGED,
  NetWorthChangedEvent,
} from '../../common/events/net-worth-changed.event';

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
    private readonly settingsService: SettingsService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
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
      const result = await this.dataSource.transaction(async (manager) => {
        const account = this.accountRepo.create(
          this.accountMapper.toEntity(dto, userId, idempotencyKey, resolvedCurrency),
        );
        const saved = await this.accountRepo.save(account, manager);
        return this.accountMapper.toDetail(saved);
      });

      if (this.eventEmitter && result.balance > 0) {
        this.eventEmitter.emit(
          EVENT_NET_WORTH_CHANGED,
          new NetWorthChangedEvent(userId, 'account.create'),
        );
      }

      return result;
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

    await this.settingsService.verifyActionPin(userId, dto.pin);

    const result = await this.dataSource.transaction(async (manager) => {
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

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        EVENT_NET_WORTH_CHANGED,
        new NetWorthChangedEvent(userId, 'account.adjust_balance'),
      );
    }

    return result;
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
   * Có thể lọc theo một ví cụ thể.
   *
   * @param userId - UUID người dùng
   * @param walletId - (Tùy chọn) UUID ví cụ thể
   * @returns Danh sách account ID
   */
  async getUserAccessibleAccountIds(userId: string, walletId?: string): Promise<string[]> {
    const userWalletIds = await this.walletsService.getUserWalletIds(userId);
    if (walletId) {
      if (!userWalletIds.includes(walletId)) {
        return [];
      }
      return this.accountRepo.findAccountIdsByWalletIds([walletId]);
    }
    return this.accountRepo.findAccountIdsByWalletIds(userWalletIds);
  }

  /**
   * [CROSS-MODULE] Xác thực tính hợp lệ của tài khoản cho giao dịch Thu / Chi.
   * Kiểm tra tồn tại, không bị lưu trữ, và user có quyền ghi (OWNER hoặc EDITOR) trên ví.
   *
   * @param userId - UUID của người dùng thực hiện
   * @param accountId - UUID tài khoản
   * @returns Account entity
   */
  async validateAccountForTransaction(userId: string, accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) throw new AccountNotFoundException(accountId);
    if (account.isArchived) throw new AccountArchivedException(accountId);

    await this.assertWalletAccess(account.walletId, userId, 'write');
    return account;
  }

  /**
   * [CROSS-MODULE] Thực thi cập nhật số dư cho giao dịch Thu nhập hoặc Chi tiêu trong transaction.
   * Sử dụng Pessimistic Lock (SELECT FOR UPDATE) để ngăn chặn Race Condition.
   *
   * @param params - { accountId, type, amount }
   * @param manager - EntityManager của transaction hiện tại
   * @returns { balanceBefore, balanceAfter }
   */
  async executeTransactionBalance(
    params: {
      accountId: string;
      type: TransactionType;
      amount: number;
    },
    manager: EntityManager,
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    const { accountId, type, amount } = params;
    const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
    if (!account) throw new AccountNotFoundException(accountId);
    if (account.isArchived) throw new AccountArchivedException(accountId);

    const balanceBefore = account.balance;
    let balanceAfter: number;

    if (type === TransactionType.INCOME) {
      balanceAfter = round2(balanceBefore + amount);
    } else {
      // EXPENSE
      if (balanceBefore < amount) {
        throw new AccountInsufficientBalanceException(balanceBefore, amount);
      }
      balanceAfter = round2(balanceBefore - amount);
    }

    account.balance = balanceAfter;
    await this.accountRepo.save(account, manager);

    return { balanceBefore, balanceAfter };
  }

  /**
   * [CROSS-MODULE] Hoàn tác số dư tài khoản khi một giao dịch bị xóa.
   * - Nếu giao dịch cũ là EXPENSE: hoàn tiền lại cho tài khoản (balance + amount).
   * - Nếu giao dịch cũ là INCOME: trừ tiền khỏi tài khoản (balance - amount).
   *   (Kiểm tra số dư để không bị âm ngoài hạn mức).
   *
   * @param params - { accountId, type, amount }
   * @param manager - EntityManager của transaction hiện tại
   * @returns { balanceBefore, balanceAfter }
   */
  async revertTransactionBalance(
    params: {
      accountId: string;
      type: TransactionType;
      amount: number;
    },
    manager: EntityManager,
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    const { accountId, type, amount } = params;
    const account = await this.accountRepo.findByIdForUpdate(accountId, manager);
    if (!account) throw new AccountNotFoundException(accountId);
    if (account.isArchived) throw new AccountArchivedException(accountId);

    const balanceBefore = account.balance;
    let balanceAfter: number;

    if (type === TransactionType.EXPENSE) {
      balanceAfter = round2(balanceBefore + amount);
    } else {
      // Revert INCOME: Thu hồi lại tiền đã cộng trước đó
      if (balanceBefore < amount) {
        throw new AccountInsufficientBalanceException(balanceBefore, amount);
      }
      balanceAfter = round2(balanceBefore - amount);
    }

    account.balance = balanceAfter;
    await this.accountRepo.save(account, manager);

    return { balanceBefore, balanceAfter };
  }

  /**
   * [CROSS-MODULE] Điều chỉnh số dư khi cập nhật giao dịch (đổi số tiền, loại hoặc chuyển sang tài khoản khác).
   * Tự động sắp xếp ID tài khoản khi lock để phòng tránh Deadlock chéo.
   *
   * @param params - Cấu hình giao dịch cũ và cấu hình mới
   * @param manager - EntityManager
   * @returns { balanceAfter } của tài khoản mới
   */
  async adjustTransactionBalance(
    params: {
      old: { accountId: string; type: TransactionType; amount: number };
      new: { accountId: string; type: TransactionType; amount: number };
    },
    manager: EntityManager,
  ): Promise<{ balanceAfter: number }> {
    const { old: oldTx, new: newTx } = params;

    // TH1: Cập nhật trên cùng một tài khoản
    if (oldTx.accountId === newTx.accountId) {
      const account = await this.accountRepo.findByIdForUpdate(oldTx.accountId, manager);
      if (!account) throw new AccountNotFoundException(oldTx.accountId);
      if (account.isArchived) throw new AccountArchivedException(oldTx.accountId);

      const oldEffect = oldTx.type === TransactionType.INCOME ? oldTx.amount : -oldTx.amount;
      const newEffect = newTx.type === TransactionType.INCOME ? newTx.amount : -newTx.amount;
      const netDelta = newEffect - oldEffect;

      const newBalance = round2(account.balance + netDelta);
      if (newBalance < 0) {
        throw new AccountInsufficientBalanceException(account.balance, Math.abs(netDelta));
      }

      account.balance = newBalance;
      await this.accountRepo.save(account, manager);
      return { balanceAfter: account.balance };
    }

    // TH2: Chuyển sang tài khoản khác -> Khóa theo thứ tự ID tránh Deadlock
    const [firstId, secondId] = [oldTx.accountId, newTx.accountId].sort();
    const firstAcc = await this.accountRepo.findByIdForUpdate(firstId, manager);
    const secondAcc = await this.accountRepo.findByIdForUpdate(secondId, manager);

    if (!firstAcc) throw new AccountNotFoundException(firstId);
    if (!secondAcc) throw new AccountNotFoundException(secondId);
    if (firstAcc.isArchived) throw new AccountArchivedException(firstId);
    if (secondAcc.isArchived) throw new AccountArchivedException(secondId);

    const oldAcc = oldTx.accountId === firstId ? firstAcc : secondAcc;
    const newAcc = newTx.accountId === firstId ? firstAcc : secondAcc;

    // 1. Hoàn tác trên tài khoản cũ
    if (oldTx.type === TransactionType.EXPENSE) {
      oldAcc.balance = round2(oldAcc.balance + oldTx.amount);
    } else {
      if (oldAcc.balance < oldTx.amount) {
        throw new AccountInsufficientBalanceException(oldAcc.balance, oldTx.amount);
      }
      oldAcc.balance = round2(oldAcc.balance - oldTx.amount);
    }

    // 2. Áp dụng trên tài khoản mới
    if (newTx.type === TransactionType.INCOME) {
      newAcc.balance = round2(newAcc.balance + newTx.amount);
    } else {
      if (newAcc.balance < newTx.amount) {
        throw new AccountInsufficientBalanceException(newAcc.balance, newTx.amount);
      }
      newAcc.balance = round2(newAcc.balance - newTx.amount);
    }

    await this.accountRepo.save(oldAcc, manager);
    await this.accountRepo.save(newAcc, manager);

    return { balanceAfter: newAcc.balance };
  }
}