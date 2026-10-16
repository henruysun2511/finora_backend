import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RecurrencePeriod } from '../../../common/enums/recurrence-period.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Category } from '../../categories/entities/category.entity';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import type { BudgetPeriod } from './budget-period.entity';

@Entity('budgets')
@Unique(['walletId', 'categoryId', 'period'])
export class Budget extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_budgets_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index('idx_budgets_category_id')
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.budgets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({
    type: 'enum',
    enum: RecurrencePeriod,
    default: RecurrencePeriod.MONTHLY,
  })
  period: RecurrencePeriod;

  @Column({
    name: 'limit_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  limitAmount: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'is_rollover', default: false })
  isRollover: boolean;

  @OneToMany('BudgetPeriod', 'budget')
  periods: BudgetPeriod[];
}
