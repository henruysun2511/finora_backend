import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Loan } from './loan.entity';
import { Account } from '../../accounts/entities/account.entity';

@Entity('loan_payments')
export class LoanPayment extends BaseEntity {
  @Column({ name: 'loan_id', type: 'uuid' })
  @Index()
  loanId: string;

  @ManyToOne(() => Loan, (loan) => loan.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.loanPayments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    name: 'payment_date',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  paymentDate: Date;
}
