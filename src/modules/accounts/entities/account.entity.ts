import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AccountType } from '../enums/account-type.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';

@Entity('accounts')
export class Account extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_accounts_wallet_id')
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

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ name: 'account_number_last4', length: 4, nullable: true })
  accountNumberLast4?: string;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @OneToMany('Transaction', 'account')
  transactions: any[];

  @OneToMany('Transfer', 'fromAccount')
  outgoingTransfers: any[];

  @OneToMany('Transfer', 'toAccount')
  incomingTransfers: any[];

  @OneToMany('LoanPayment', 'account')
  loanPayments: any[];

  @OneToMany('SavingsContribution', 'account')
  savingsContributions: any[];

  @OneToMany('Receipt', 'account')
  receipts: any[];
}
