import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SavingsGoal } from './savings-goal.entity';
import { Account } from '../../accounts/entities/account.entity';

@Entity('savings_contributions')
export class SavingsContribution extends BaseEntity {
  @Column({ name: 'goal_id', type: 'uuid' })
  @Index()
  goalId: string;

  @ManyToOne(() => SavingsGoal, (goal) => goal.contributions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: SavingsGoal;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.savingsContributions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    name: 'contribution_date',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  contributionDate: Date;
}
