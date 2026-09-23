import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WalletType } from '../../../common/enums/wallet-type.enum';
import { User } from '../../users/entities/user.entity';
import type { WalletMember } from './wallet-member.entity';
import type { Account } from '../../accounts/entities/account.entity';
import type { Budget } from '../../budgets/entities/budget.entity';
import type { RecurringTransaction } from '../../recurring-transactions/entities/recurring-transaction.entity';
import type { SavingsGoal } from '../../savings/entities/savings-goal.entity';
import type { Loan } from '../../loans/entities/loan.entity';
import type { ChatMessage } from '../../chat/entities/chat-message.entity';

@Entity('wallets')
export class Wallet extends BaseEntity {
  @Column({ name: 'owner_id', type: 'uuid' })
  @Index()
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ length: 150 })
  @Index()
  name: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'default_currency', length: 10, default: 'VND' })
  defaultCurrency: string;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.PERSONAL,
  })
  type: WalletType;

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @OneToMany('WalletMember', 'wallet')
  members: WalletMember[];

  @OneToMany('Account', 'wallet')
  accounts: Account[];

  @OneToMany('Budget', 'wallet')
  budgets: Budget[];

  @OneToMany('RecurringTransaction', 'wallet')
  recurringTransactions: RecurringTransaction[];

  @OneToMany('SavingsGoal', 'wallet')
  savingsGoals: SavingsGoal[];

  @OneToMany('Loan', 'wallet')
  loans: Loan[];

  @OneToMany('ChatMessage', 'wallet')
  chatMessages: ChatMessage[];
}
