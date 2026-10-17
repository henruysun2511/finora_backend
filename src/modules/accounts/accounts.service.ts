// src/modules/accounts/accounts.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRepository } from './repository/account.repository';
import { AccountBalanceAdjustmentRepository } from './repository/account-balance-adjustment.repository';
import { WalletRepository } from '../wallets/repository/wallet.repository';
import { WalletMemberRepository } from '../wallets/repository/wallet-member.repository';
import { AccountMapper } from './mapper/account.mapper';
import { CreateAccountDto } from './dto/request/create-account.dto';
import { UpdateAccountDto } from './dto/request/update-account.dto';
import { AccountQueryDto } from './dto/request/account-query.dto';
import { AdjustBalanceDto } from './dto/request/adjust-balance.dto';
import { ACCOUNT_WRITE_ROLES } from './accounts.constant';
import {
  AccountAccessDeniedException,
  AccountArchivedException,
  AccountCurrencyChangeNotAllowedException,
  AccountHasTransactionsException,
  AccountInsufficientBalanceException,
  AccountNameAlreadyExistsException,
  AccountNotFoundException,
  AccountWalletNotFoundException,
  IdempotencyKeyRequiredException,
} from './exceptions/account.exception';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../common/enums/wallet-member-role.enum';
import { BalanceDirection } from '../../common/enums/balance-direction.enum';

type AccessMode = 'read' | 'write';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class AccountsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accountRepo: AccountRepository,
    private readonly adjustmentRepo: AccountBalanceAdjustmentRepository,
    private readonly walletRepo: WalletRepository,
    private readonly walletMemberRepo: WalletMemberRepository,
    private readonly accountMapper: AccountMapper,
  ) {}

  // ---------------------------------------------------------------- helpers

  /** Ném lỗi nếu ví không tồn tại hoặc user không đủ quyền. */
  private async assertWalletAccess(
    walletId: string,
    userId: string,
    mode: AccessMode,
  ): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) throw new AccountWalletNotFoundException(walletId);

    let role: WalletMemberRole | null = null;
    if (wallet.ownerId === userId) {
      role = WalletMemberRole.OWNER;
    } else {
      const member = await this.walletMemberRepo.findByWalletAndUser(walletId, userId);
      if (member && member.status === WalletMemberStatus.ACCEPTED) {
        role = member.role;
      }
    }

    if (!role) throw new AccountAccessDeniedException(walletId);
    if (mode === 'write' && !ACCOUNT_WRITE_ROLES.includes(role)) {
      throw new AccountAccessDeniedException(walletId);
    }
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

    await this.assertWalletAccess(dto.walletId, userId, 'write');

    const duplicated = await this.accountRepo.findByWalletAndName(dto.walletId, dto.name);
    if (duplicated) throw new AccountNameAlreadyExistsException(dto.name);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = this.accountRepo.create(
          this.accountMapper.toEntity(dto, userId, idempotencyKey),
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

  async listAccounts(userId: string, query: AccountQueryDto) {
    const wallets = await this.walletRepo.findWalletsByUserId(userId);
    let walletIds = wallets.map((w) => w.id);

    if (query.walletId) {
      if (!walletIds.includes(query.walletId)) {
        throw new AccountAccessDeniedException(query.walletId);
      }
      walletIds = [query.walletId];
    }

    const [accounts, total] = await this.accountRepo.findPaged(query, walletIds);
    return {
      items: accounts.map((a) => this.accountMapper.toResponse(a)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
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
      await this.assertWalletAccess(account.walletId, userId, 'write');

      if (account.isArchived) throw new AccountArchivedException(accountId);

      if (dto.name !== undefined && dto.name.toLowerCase() !== account.name.toLowerCase()) {
        const duplicated = await this.accountRepo.findByWalletAndName(account.walletId, dto.name);
        if (duplicated && duplicated.id !== account.id) {
          throw new AccountNameAlreadyExistsException(dto.name);
        }
      }

      if (dto.currency !== undefined && dto.currency !== account.currency) {
        const hasHistory = await this.accountRepo.hasFinancialHistory(account.id, manager);
        if (account.balance !== 0 || hasHistory) {
          throw new AccountCurrencyChangeNotAllowedException(accountId);
        }
        account.currency = dto.currency;
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
}