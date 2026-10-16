import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LifecycleStatus } from '../../../common/enums/lifecycle-status.enum';
import { LoanType } from '../enums/loan-type.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { User } from '../../users/entities/user.entity';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import type { LoanPayment } from './loan-payment.entity';

@Entity('loans')
export class Loan extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_loans_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'counterparty_user_id', type: 'uuid', nullable: true })
  @Index('idx_loans_counterparty_user_id')
  counterpartyUserId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'counterparty_user_id' })
  counterpartyUser?: User;

  @Column({ name: 'counterparty_name', length: 150 })
  counterpartyName: string;

  @Column({
    type: 'enum',
    enum: LoanType,
  })
  type: LoanType;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  principalAmount: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    type: 'enum',
    enum: LifecycleStatus,
    default: LifecycleStatus.ACTIVE,
  })
  status: LifecycleStatus;

  @OneToMany('LoanPayment', 'loan')
  payments: LoanPayment[];
}
