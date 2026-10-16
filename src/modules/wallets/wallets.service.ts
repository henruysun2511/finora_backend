import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletRepository } from './repository/wallet.repository';
import { WalletMemberRepository } from './repository/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';
import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import {
  WalletNameAlreadyExistsException,
} from './exceptions/wallet.exception';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../common/enums/wallet-member-role.enum';

@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletRepo: WalletRepository,
    private readonly walletMemberRepo: WalletMemberRepository,
    private readonly walletMapper: WalletMapper,
  ) {}

  /**
   * Tạo ví mới và tự động gán người tạo làm chủ sở hữu (OWNER) trong transaction.
   */
  async createWallet(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    // 1. Kiểm tra trùng tên ví trong danh sách ví của cùng một owner
    const existing = await this.walletRepo.findByNameAndOwnerId(
      dto.name,
      userId,
    );
    if (existing) {
      throw new WalletNameAlreadyExistsException(dto.name);
    }

    // 2. Thực hiện transaction tạo ví và bản ghi thành viên OWNER
    return this.dataSource.transaction(async (manager) => {
      // 2.1. Tạo và lưu Wallet
      const walletData = this.walletMapper.toEntity(dto, userId);
      const wallet = this.walletRepo.create(walletData);
      const savedWallet = await this.walletRepo.save(wallet, manager);

      // 2.2. Tạo và lưu bản ghi WalletMember đầu tiên với role OWNER
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
}
