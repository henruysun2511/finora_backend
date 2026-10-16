import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { RecurrencePeriod } from '../../../common/enums/recurrence-period.enum';
import { Account } from '../../accounts/entities/account.entity';
import { Category } from '../../categories/entities/category.entity';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity('recurring_transactions')
export class RecurringTransaction extends BaseEntity {
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

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: RecurrencePeriod,
    default: RecurrencePeriod.MONTHLY,
  })
  frequency: RecurrencePeriod;

  @Column({ name: 'next_run_date', type: 'date' })
  @Index('idx_recurring_transactions_next_run_date')
  nextRunDate: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
