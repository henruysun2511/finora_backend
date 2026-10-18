// src/modules/accounts/entities/account.entity.ts
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
import { decimalTransformer } from '../utils/decimal.transformer';

@Entity('accounts')
@Index('uq_accounts_creator_idempotency', ['createdBy', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
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

  @Column({ type: 'varchar', nullable: true, length: 255 })
  icon?: string | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  color?: string | null;

  @Column({ name: 'account_number_last4', type: 'varchar', length: 4, nullable: true })
  accountNumberLast4?: string | null;

  @Column({
    type: 'decimal',
    precision: 19,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  balance: number;

  @Column({
    name: 'initial_balance',
    type: 'decimal',
    precision: 19,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  initialBalance: number;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey?: string | null;

  @OneToMany('Transaction', 'account')
  transactions: any[];

  @OneToMany('Transfer', 'fromAccount')
  outgoingTransfers: any[];

  @OneToMany('Transfer', 'toAccount')
  incomingTransfers: any[];

  @OneToMany('LoanPayment', 'account')
  loanPayments: any[];



  @OneToMany('Receipt', 'account')
  receipts: any[];
}