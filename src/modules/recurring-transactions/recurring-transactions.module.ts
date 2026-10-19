import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringTransaction } from './entities/recurring-transaction.entity';
import { RecurringTransactionsController } from './recurring-transactions.controller';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { RecurringTransactionRepository } from './repositories/recurring-transaction.repository';
import { RecurringTransactionMapper } from './mapper/recurring-transaction.mapper';
import { RecurringTransactionsScheduler } from './schedulers/recurring-transactions.scheduler';
import { WalletsModule } from '../wallets/wallets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringTransaction]),
    WalletsModule,
    AccountsModule,
    TransactionsModule,
    NotificationsModule,
  ],
  controllers: [RecurringTransactionsController],
  providers: [
    RecurringTransactionsService,
    RecurringTransactionRepository,
    RecurringTransactionMapper,
    RecurringTransactionsScheduler,
  ],
  exports: [RecurringTransactionsService],
})
export class RecurringTransactionsModule {}
