// src/modules/accounts/accounts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { AccountBalanceAdjustment } from './entities/account-balance-adjustment.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountRepository } from './repositories/account.repository';
import { AccountBalanceAdjustmentRepository } from './repositories/account-balance-adjustment.repository';
import { AccountMapper } from './mapper/account.mapper';
import { WalletsModule } from '../wallets/wallets.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountBalanceAdjustment]),
    WalletsModule,
    SettingsModule,
  ],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    AccountRepository,
    AccountBalanceAdjustmentRepository,
    AccountMapper,
  ],
  exports: [AccountsService],
})
export class AccountsModule {}