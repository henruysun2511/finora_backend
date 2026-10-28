import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Receipt } from './entities/receipt.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { ReceiptRepository } from './repositories/receipt.repository';
import { TransactionMapper } from './mapper/transaction.mapper';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Receipt]),
    AccountsModule,
    CategoriesModule,
    BudgetsModule,
    AuditLogsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionRepository,
    ReceiptRepository,
    TransactionMapper,
    TransactionsService,
  ],
  exports: [TransactionsService, TransactionRepository, ReceiptRepository],
})
export class TransactionsModule {}
