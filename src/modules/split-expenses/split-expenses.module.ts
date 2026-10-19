import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseSplit } from './entities/expense-split.entity';
import { SplitParticipant } from './entities/split-participant.entity';
import { Loan } from '../loans/entities/loan.entity';
import { ExpenseSplitRepository } from './repositories/expense-split.repository';
import { SplitParticipantRepository } from './repositories/split-participant.repository';
import { SplitExpenseMapper } from './mapper/split-expense.mapper';
import { SplitExpensesService } from './split-expenses.service';
import { TransactionSplitsController } from './controllers/transaction-splits.controller';
import { SplitsController } from './controllers/splits.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpenseSplit, SplitParticipant, Loan]),
    TransactionsModule,
    FriendsModule,
    NotificationsModule,
  ],
  controllers: [TransactionSplitsController, SplitsController],
  providers: [
    ExpenseSplitRepository,
    SplitParticipantRepository,
    SplitExpenseMapper,
    SplitExpensesService,
  ],
  exports: [
    SplitExpensesService,
    ExpenseSplitRepository,
    SplitParticipantRepository,
  ],
})
export class SplitExpensesModule {}
