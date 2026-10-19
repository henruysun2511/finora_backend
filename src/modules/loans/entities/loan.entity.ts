import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LoanType } from '../enums/loan-type.enum';
import { LoanStatus } from '../enums/loan-status.enum';
import { LoanInterestPeriod } from '../enums/loan-interest-period.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';
import { LoanPayment } from './loan-payment.entity';

@Entity('loans')
export class Loan extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_loans_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_loans_account_id')
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index('idx_loans_created_by')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'counterparty_user_id', type: 'uuid', nullable: true })
  @Index('idx_loans_counterparty_user_id')
  counterpartyUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'counterparty_user_id' })
  counterpartyUser?: User | null;

  @Column({
    type: 'enum',
    enum: LoanType,
    default: LoanType.LENT,
  })
  type: LoanType;

  @Column({ name: 'contact_name', length: 150 })
  contactName: string;

  @Column({ name: 'contact_info', length: 255, nullable: true })
  contactInfo?: string | null;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  principalAmount: number;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
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
    transformer: new DecimalTransformer(),
  })
  interestRate?: number | null;

  @Column({
    name: 'interest_period',
    type: 'enum',
    enum: LoanInterestPeriod,
    nullable: true,
  })
  interestPeriod?: LoanInterestPeriod | null;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'loan_date', type: 'timestamptz' })
  loanDate: Date;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate?: Date | null;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @Column({ name: 'affects_balance', default: true })
  affectsBalance: boolean;

  @OneToMany(() => LoanPayment, (payment) => payment.loan)
  payments: LoanPayment[];
}
