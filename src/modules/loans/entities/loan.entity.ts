import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LoanType } from '../../../common/enums/loan-type.enum';
import { LoanStatus } from '../../../common/enums/loan-status.enum';
import { InterestPeriod } from '../../../common/enums/interest-period.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';
import type { LoanPayment } from './loan-payment.entity';

@Entity('loans')
export class Loan extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.loans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.loans, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({
    type: 'enum',
    enum: LoanType,
    default: LoanType.LENT,
  })
  type: LoanType;

  @Column({ name: 'contact_name', length: 150 })
  contactName: string;

  @Column({ name: 'contact_info', length: 255, nullable: true })
  contactInfo?: string;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  principalAmount: number;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  remainingAmount: number;

  @Column({ name: 'is_interest_bearing', default: false })
  isInterestBearing: boolean;

  @Column({
    name: 'interest_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  interestRate?: number;

  @Column({
    name: 'interest_period',
    type: 'enum',
    enum: InterestPeriod,
    nullable: true,
  })
  interestPeriod?: InterestPeriod;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    name: 'loan_date',
    type: 'timestamp with time zone',
  })
  loanDate: Date;

  @Column({
    name: 'due_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  dueDate?: Date;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @OneToMany('LoanPayment', 'loan')
  payments: LoanPayment[];
}
