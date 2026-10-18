import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletRepository } from './repository/wallet.repository';
import { WalletMemberRepository } from './repository/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletMember])],
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
