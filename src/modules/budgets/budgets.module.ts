import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';
import { BudgetPeriod } from './entities/budget-period.entity';
import { Budget } from './entities/budget.entity';
import { BudgetMapper } from './mapper/budget.mapper';
import { BudgetPeriodRepository } from './repositories/budget-period.repository';
import { BudgetRepository } from './repositories/budget.repository';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { BudgetPeriodScheduler } from './schedulers/budget-period.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, BudgetPeriod]),
    WalletsModule,
    CategoriesModule,
    NotificationsModule,
  ],
  controllers: [BudgetsController],
  providers: [
    BudgetRepository,
    BudgetPeriodRepository,
    BudgetMapper,
    BudgetsService,
    BudgetPeriodScheduler,
  ],
  exports: [BudgetsService],
})
export class BudgetsModule {}
