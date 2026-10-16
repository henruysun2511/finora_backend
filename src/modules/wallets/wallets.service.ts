
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { WalletRepository } from './repository/wallet.repository';
import { WalletMemberRepository } from './repository/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';

import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { UpdateWalletDto } from './dto/request/update-wallet.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';

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

      return this.walletMapper.toResponse(
        savedWallet,
        WalletMemberRole.OWNER,
      );
    });
  }

  // Lấy danh sách ví có phân trang.
  async getWallets(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<WalletResponseDto>> {
    const safePage =
      Number.isInteger(page) && page > 0 ? page : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 10;

    const [wallets, total] =
      await this.walletRepo.findWalletsByUserIdPaginated(
        userId,
        safePage,
        safeLimit,
      );

    const items = this.walletMapper.toResponseList(wallets);

    return PaginatedResponse.of(
      items,
      total,
      safePage,
      safeLimit,
    );
  }

  // Kiểm tra người dùng có phải thành viên đã được chấp nhận không.
  private async getAcceptedMember(
    walletId: string,
    userId: string,
  ) {
    const member =
      await this.walletMemberRepo.findByWalletAndUser(
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

  // Xem chi tiết ví.
  async getWalletById(
    walletId: string,
    userId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(
      walletId,
      userId,
    );

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

    const member = await this.getAcceptedMember(
      walletId,
      userId,
    );

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (dto.name && dto.name !== wallet.name) {
      const existing =
        await this.walletRepo.findByNameAndOwnerId(
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

    return this.walletMapper.toResponse(
      savedWallet,
      member.role,
    );
  }

  // Xóa mềm ví: chỉ OWNER được phép.
  async deleteWallet(
    walletId: string,
    userId: string,
  ): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(
      walletId,
      userId,
    );

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    await this.walletRepo.softDeleteById(walletId);
  }
}
