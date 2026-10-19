import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Loan } from './entities/loan.entity';
import { LoanPayment } from './entities/loan-payment.entity';

import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoanRepository } from './repositories/loan.repository';
import { LoanPaymentRepository } from './repositories/loan-payment.repository';
import { LoanMapper } from './mapper/loan.mapper';

import { WalletsModule } from '../wallets/wallets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanPayment]),
    WalletsModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [LoansController],
  providers: [
    LoansService,
    LoanRepository,
    LoanPaymentRepository,
    LoanMapper,
  ],
  exports: [LoansService],
})
export class LoansModule {}
