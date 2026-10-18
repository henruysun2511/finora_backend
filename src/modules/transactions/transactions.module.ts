import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionMapper } from './mapper/transaction.mapper';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AccountsModule,
    CategoriesModule,
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
