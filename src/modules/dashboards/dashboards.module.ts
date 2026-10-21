import { Module } from '@nestjs/common';
import { AdminDashboardController, DashboardController } from './dashboards.controller';
import { DashboardService } from './dashboards.service';
import { DashboardRepository } from './repositories/dashboards.repository';
import { WalletsModule } from '../wallets/wallets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { DashboardMapper } from './mapper/dashboards.mapper';

@Module({
  imports: [WalletsModule, AccountsModule, TransactionsModule],
  controllers: [DashboardController, AdminDashboardController],
  providers: [DashboardService, DashboardRepository, DashboardMapper],
  exports: [DashboardService],
})
export class DashboardModule {}