import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionMapper } from './mapper/transaction.mapper';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { MascotsModule } from '../mascots/mascots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AccountsModule,
    CategoriesModule,
    BudgetsModule,
    MascotsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionRepository,
    TransactionMapper,
    TransactionsService,
  ],
  exports: [TransactionsService, TransactionRepository],
})
export class TransactionsModule {}
