import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { Account } from '../accounts/entities/account.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletMemberRepository } from './repositories/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletMember, Account])],
  controllers: [WalletsController],
  providers: [
    WalletsService,
    WalletRepository,
    WalletMemberRepository,
    WalletMapper,
  ],
  exports: [WalletsService],
})
export class WalletsModule {}
