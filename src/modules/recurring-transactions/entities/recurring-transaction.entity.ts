import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { RecurrencePeriod } from '../enums/recurrence-period.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('recurring_transactions')
export class RecurringTransaction extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_recurring_transactions_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_recurring_transactions_account_id')
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index('idx_recurring_transactions_category_id')
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index('idx_recurring_transactions_created_by')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: RecurrencePeriod,
    default: RecurrencePeriod.MONTHLY,
  })
  frequency: RecurrencePeriod;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate?: Date | null;

  @Column({ name: 'next_run_date', type: 'timestamptz' })
  @Index('idx_recurring_transactions_next_run_date')
  nextRunDate: Date;

  @Column({ name: 'is_paused', default: false })
  isPaused: boolean;
}
