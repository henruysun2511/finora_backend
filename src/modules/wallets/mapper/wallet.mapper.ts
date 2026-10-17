import { Injectable } from '@nestjs/common';
import { Wallet } from '../entities/wallet.entity';
import { CreateWalletDto } from '../dto/request/create-wallet.dto';
import { WalletResponseDto } from '../dto/response/wallet-response.dto';
import { WalletMemberRole } from '../../../common/enums/wallet-member-role.enum';
import { WALLET_DEFAULTS } from '../wallets.constant';

@Injectable()
export class WalletMapper {
  toEntity(dto: CreateWalletDto, ownerId: string): Partial<Wallet> {
    return {
      ownerId,
      name: dto.name,
      icon: dto.icon,
      description: dto.description,
      defaultCurrency: dto.defaultCurrency ?? WALLET_DEFAULTS.CURRENCY,
      isShared: dto.isShared ?? false,
      isActive: true,
    };
  }

  toResponse(
    wallet: Wallet,
    currentUserRole?: WalletMemberRole,
  ): WalletResponseDto {
    return {
      id: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      description: wallet.description,
      defaultCurrency: wallet.defaultCurrency,
      isShared: wallet.isShared,
      isActive: wallet.isActive,
      ownerId: wallet.ownerId,
      currentUserRole,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  toResponseList(
    wallets: Wallet[],
    roleMap?: Map<string, WalletMemberRole>,
  ): WalletResponseDto[] {
    return wallets.map((w) => this.toResponse(w, roleMap?.get(w.id)));
  }
}
