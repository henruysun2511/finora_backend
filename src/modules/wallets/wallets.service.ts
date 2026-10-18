import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Wallet } from './entities/wallet.entity';
import { WalletRepository } from './repository/wallet.repository';
import { WalletMemberRepository } from './repository/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';

import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { UpdateWalletDto } from './dto/request/update-wallet.dto';
import { WalletQueryDto } from './dto/request/wallet-query.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import { WalletAccountResponseDto } from './dto/response/wallet-account-response.dto';
import { WalletBalanceResponseDto } from './dto/response/wallet-balance-response.dto';

import {
  WalletNotFoundException,
  WalletAccessDeniedException,
  WalletNameAlreadyExistsException,
} from './exceptions/wallet.exception';

import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../common/enums/wallet-member-role.enum';

import { PaginatedResponse } from '../../common/response/api-response';

@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletRepo: WalletRepository,
    private readonly walletMemberRepo: WalletMemberRepository,
    private readonly walletMapper: WalletMapper,
  ) {}

  // Tạo ví và tự động thêm người tạo làm OWNER.
  async createWallet(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    const existing = await this.walletRepo.findByNameAndOwnerId(
      dto.name,
      userId,
    );

    if (existing) {
      throw new WalletNameAlreadyExistsException(dto.name);
    }

    return this.dataSource.transaction(async (manager) => {
      const walletData = this.walletMapper.toEntity(dto, userId);
      const wallet = this.walletRepo.create(walletData);
      const savedWallet = await this.walletRepo.save(wallet, manager);

      const member = this.walletMemberRepo.create({
        walletId: savedWallet.id,
        userId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
        joinedAt: new Date(),
      });

      await this.walletMemberRepo.save(member, manager);

      return this.walletMapper.toResponse(savedWallet, WalletMemberRole.OWNER);
    });
  }

  // Lấy danh sách ví có phân trang.
  async getWallets(
    userId: string,
    query: WalletQueryDto,
  ): Promise<PaginatedResponse<WalletResponseDto>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    const [wallets, total] = await this.walletRepo.findWalletsByUserIdPaginated(
      userId,
      safePage,
      safeLimit,
    );

    const roleMap = new Map<string, WalletMemberRole>();
    for (const wallet of wallets) {
      const currentMember = wallet.members?.find((m) => m.userId === userId);
      if (currentMember) {
        roleMap.set(wallet.id, currentMember.role);
      }
    }

    const items = this.walletMapper.toResponseList(wallets, roleMap);

    return PaginatedResponse.of(items, total, safePage, safeLimit);
  }

  // Kiểm tra người dùng có phải thành viên đã được chấp nhận không.
  private async getAcceptedMember(walletId: string, userId: string) {
    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.ACCEPTED
    ) {
      throw new WalletAccessDeniedException(walletId);
    }

    return member;
  }

  /**
   * Xem chi tiết ví theo ID.
   * [CROSS-MODULE]: Các module khác (như AccountsService, TransactionsService...) gọi hàm này
   * để xác thực quyền truy cập ví của người dùng trước khi thao tác dữ liệu (tạo tài khoản, giao dịch...).
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns WalletResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu user không có quyền truy cập
   */
  async getWalletById(
    walletId: string,
    userId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    return this.walletMapper.toResponse(wallet, member.role);
  }

  // Cập nhật thông tin ví: chỉ OWNER được phép.
  async updateWallet(
    walletId: string,
    userId: string,
    dto: UpdateWalletDto,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (dto.name && dto.name !== wallet.name) {
      const existing = await this.walletRepo.findByNameAndOwnerId(
        dto.name,
        wallet.ownerId,
      );

      if (existing && existing.id !== walletId) {
        throw new WalletNameAlreadyExistsException(dto.name);
      }
    }

    if (dto.name !== undefined) {
      wallet.name = dto.name;
    }

    if (dto.icon !== undefined) {
      wallet.icon = dto.icon;
    }

    if (dto.description !== undefined) {
      wallet.description = dto.description;
    }

    if (dto.defaultCurrency !== undefined) {
      wallet.defaultCurrency = dto.defaultCurrency;
    }

    if (dto.isShared !== undefined) {
      wallet.isShared = dto.isShared;
    }

    const savedWallet = await this.walletRepo.save(wallet);

    return this.walletMapper.toResponse(savedWallet, member.role);
  }

  // Xóa mềm ví: chỉ OWNER được phép.
  async deleteWallet(walletId: string, userId: string): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    await this.walletRepo.softDeleteById(walletId);
  }

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Kiểm tra ví có tồn tại hay không.
   *
   * @param walletId - UUID của ví
   * @returns boolean
   */
  async exists(walletId: string): Promise<boolean> {
    const wallet = await this.walletRepo.findById(walletId);
    return Boolean(wallet);
  }

  /**
   * [CROSS-MODULE] Tìm entity Wallet theo ID.
   *
   * @param walletId - UUID của ví
   * @returns Wallet entity hoặc null nếu không tồn tại
   */
  async findById(walletId: string): Promise<Wallet | null> {
    return this.walletRepo.findById(walletId);
  }

  /**
   * [CROSS-MODULE] Lấy vai trò thành viên của người dùng trong ví.
   * Trả về WalletMemberRole nếu là OWNER hoặc thành viên ACCEPTED, ngược lại trả về null.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng
   * @returns WalletMemberRole hoặc null
   */
  async getMemberRole(
    walletId: string,
    userId: string,
  ): Promise<WalletMemberRole | null> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      return null;
    }

    if (wallet.ownerId === userId) {
      return WalletMemberRole.OWNER;
    }

    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );
    if (
      member &&
      !member.deletedAt &&
      member.status === WalletMemberStatus.ACCEPTED
    ) {
      return member.role;
    }

    return null;
  }

  /**
   * [CROSS-MODULE] Lấy danh sách ID ví mà người dùng có quyền truy cập (owner hoặc thành viên).
   *
   * @param userId - UUID của người dùng
   * @returns Mảng các UUID của ví
   */
  async getUserWalletIds(userId: string): Promise<string[]> {
    const wallets = await this.walletRepo.findWalletsByUserId(userId);
    return wallets.map((w) => w.id);
  }

  /**
   * [CROSS-MODULE] Lấy danh sách các entity Wallet mà người dùng có quyền truy cập.
   *
   * @param userId - UUID của người dùng
   * @returns Mảng các Wallet entity
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findWalletsByUserId(userId);
  }

  /**
   * [CROSS-MODULE] Lấy danh sách tài khoản trong ví.
   * Dùng cho controller và các module ngoại vi (TransactionsService, BudgetsService...)
   * cần tra cứu danh sách tài khoản hợp lệ thuộc một ví sau khi đã xác thực quyền thành viên.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns Danh sách WalletAccountResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu người dùng không thuộc ví
   */
  async getWalletAccounts(
    walletId: string,
    userId: string,
  ): Promise<WalletAccountResponseDto[]> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    await this.getAcceptedMember(walletId, userId);

    const accounts = await this.walletRepo.findAccountsByWalletId(walletId);
    const accountIds = accounts.map((a) => a.id);
    const balanceMap =
      await this.walletRepo.getBalancesByAccountIds(accountIds);

    return this.walletMapper.toAccountResponseList(accounts, balanceMap);
  }

  /**
   * [CROSS-MODULE] Lấy tổng tài sản và thông tin số dư của ví.
   * Dùng cho controller và các module ngoại vi (DashboardService, ReportsService...)
   * cần tra cứu tổng số dư tài sản theo ví sau khi đã xác thực quyền thành viên.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns WalletBalanceResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu người dùng không thuộc ví
   */
  async getWalletBalance(
    walletId: string,
    userId: string,
  ): Promise<WalletBalanceResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    await this.getAcceptedMember(walletId, userId);

    const accounts = await this.walletRepo.findAccountsByWalletId(walletId);
    const accountIds = accounts.map((a) => a.id);
    const balanceMap =
      await this.walletRepo.getBalancesByAccountIds(accountIds);

    return this.walletMapper.toBalanceResponse(wallet, accounts, balanceMap);
  }
}

