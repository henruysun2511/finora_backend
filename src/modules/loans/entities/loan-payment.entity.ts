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
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('loan_payments')
export class LoanPayment extends BaseEntity {
  @Column({ name: 'loan_id', type: 'uuid' })
  @Index('idx_loan_payments_loan_id')
  loanId: string;

  @ManyToOne(() => Loan, (loan) => loan.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_loan_payments_account_id')
  accountId: string;

  @ManyToOne(() => Account, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({ name: 'payment_date', type: 'timestamptz' })
  @Index('idx_loan_payments_date')
  paymentDate: Date;

  @Column({ name: 'affects_balance', default: true })
  affectsBalance: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
