import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GoalStatus } from '../../../common/enums/goal-status.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import type { SavingsContribution } from './savings-contribution.entity';

@Entity('savings_goals')
export class SavingsGoal extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.savingsGoals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.savingsGoals, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ length: 150 })
  name: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean;

  @Column({
    name: 'target_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  targetAmount: number;

  @Column({
    name: 'current_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  currentAmount: number;

  @Column({
    name: 'target_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  targetDate?: Date;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @OneToMany('SavingsContribution', 'goal')
  contributions: SavingsContribution[];
}
