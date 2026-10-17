import { Injectable } from '@nestjs/common';
import { Wallet } from '../entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import { CreateWalletDto } from '../dto/request/create-wallet.dto';
import { WalletResponseDto } from '../dto/response/wallet-response.dto';
import { WalletAccountResponseDto } from '../dto/response/wallet-account-response.dto';
import { WalletBalanceResponseDto } from '../dto/response/wallet-balance-response.dto';
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

  toAccountResponse(account: Account, balance = 0): WalletAccountResponseDto {
    return {
      id: account.id,
      walletId: account.walletId,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance,
      icon: account.icon,
      color: account.color,
      accountNumberLast4: account.accountNumberLast4,
      isArchived: account.isArchived,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  toAccountResponseList(
    accounts: Account[],
    balanceMap?: Map<string, number>,
  ): WalletAccountResponseDto[] {
    return accounts.map((account) =>
      this.toAccountResponse(account, balanceMap?.get(account.id) ?? 0),
    );
  }

  toBalanceResponse(
    wallet: Wallet,
    accounts: Account[],
    balanceMap: Map<string, number>,
  ): WalletBalanceResponseDto {
    const breakdownByCurrency: Record<string, number> = {};
    let totalBalance = 0;

    for (const account of accounts) {
      if (account.isArchived) continue;
      const bal = balanceMap.get(account.id) ?? 0;
      breakdownByCurrency[account.currency] =
        (breakdownByCurrency[account.currency] ?? 0) + bal;

      if (account.currency === wallet.defaultCurrency) {
        totalBalance += bal;
      }
    }

    if (
      totalBalance === 0 &&
      Object.keys(breakdownByCurrency).length === 1 &&
      !breakdownByCurrency[wallet.defaultCurrency]
    ) {
      const singleCurrency = Object.keys(breakdownByCurrency)[0];
      totalBalance = breakdownByCurrency[singleCurrency];
    }

    return {
      walletId: wallet.id,
      walletName: wallet.name,
      defaultCurrency: wallet.defaultCurrency,
      totalBalance,
      breakdownByCurrency,
      accountsCount: accounts.filter((a) => !a.isArchived).length,
    };
  }
}
