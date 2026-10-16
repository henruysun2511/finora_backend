import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AccountType } from '../../../common/enums/account-type.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import type { Transaction } from '../../transactions/entities/transaction.entity';
import type { Receipt } from '../../transactions/entities/receipt.entity';
import type { Transfer } from '../../transactions/entities/transfer.entity';
import type { SavingsGoal } from '../../savings/entities/savings-goal.entity';
import type { SavingsContribution } from '../../savings/entities/savings-contribution.entity';
import type { Loan } from '../../loans/entities/loan.entity';
import type { LoanPayment } from '../../loans/entities/loan-payment.entity';

@Entity('accounts')
export class Account extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.CASH,
  })
  type: AccountType;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  balance: number;

  @Column({
    name: 'available_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  availableBalance: number;

  @Column({ name: 'account_number_last4', length: 4, nullable: true })
  accountNumberLast4?: string;

  @Column({ name: 'bank_code', length: 50, nullable: true })
  bankCode?: string;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ name: 'exclude_from_net_worth', default: false })
  excludeFromNetWorth: boolean;

  @OneToMany('Transaction', 'account')
  transactions: Transaction[];

  @OneToMany('Receipt', 'account')
  receipts: Receipt[];

  @OneToMany('Transfer', 'fromAccount')
  outgoingTransfers: Transfer[];

  @OneToMany('Transfer', 'toAccount')
  incomingTransfers: Transfer[];

  @OneToMany('SavingsGoal', 'account')
  savingsGoals: SavingsGoal[];

  @OneToMany('SavingsContribution', 'account')
  savingsContributions: SavingsContribution[];

  @OneToMany('Loan', 'account')
  loans: Loan[];

  @OneToMany('LoanPayment', 'account')
  loanPayments: LoanPayment[];
}
