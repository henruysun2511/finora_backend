import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BudgetPeriod } from '../../../common/enums/budget-period.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('budgets')
export class Budget extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.budgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index()
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.budgets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({
    name: 'amount_limit',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amountLimit: number;

  @Column({
    type: 'enum',
    enum: BudgetPeriod,
    default: BudgetPeriod.MONTHLY,
  })
  period: BudgetPeriod;

  @Column({
    name: 'used_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  usedAmount: number;

  @Column({
    name: 'period_start',
    type: 'timestamp with time zone',
  })
  periodStart: Date;

  @Column({
    name: 'period_end',
    type: 'timestamp with time zone',
  })
  periodEnd: Date;

  @Column({ name: 'rollover_enabled', default: false })
  rolloverEnabled: boolean;

  @Column({ name: 'notify_threshold', type: 'int', default: 80 })
  notifyThreshold: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
