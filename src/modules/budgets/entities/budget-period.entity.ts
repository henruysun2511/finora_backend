import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Budget } from './budget.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('budget_periods')
@Unique(['budgetId', 'startDate', 'endDate'])
export class BudgetPeriod extends BaseEntity {
  @Column({ name: 'budget_id', type: 'uuid' })
  @Index('idx_budget_periods_budget_id')
  budgetId: string;

  @ManyToOne(() => Budget, (budget) => budget.periods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: Budget;

  @Column({ name: 'start_date', type: 'date' })
  @Index('idx_budget_periods_start_date')
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  @Index('idx_budget_periods_end_date')
  endDate: string;

  @Column({
    name: 'limit_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  limitAmount: number;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  spentAmount: number;

  @Column({
    name: 'rollover_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  rolloverAmount: number;
}
