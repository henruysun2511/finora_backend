import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ParticipantStatus } from '../enums/participant-status.enum';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import { ExpenseSplit } from './expense-split.entity';
import { User } from '../../users/entities/user.entity';
import { Loan } from '../../loans/entities/loan.entity';

@Entity('split_participants')
@Unique(['splitId', 'userId'])
export class SplitParticipant extends BaseEntity {
  @Column({ name: 'split_id', type: 'uuid' })
  @Index('idx_split_participants_split_id')
  splitId: string;

  @ManyToOne(() => ExpenseSplit, (split) => split.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'split_id' })
  split: ExpenseSplit;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_split_participants_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'assigned_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  assignedAmount: number;

  @Column({
    name: 'proposed_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  proposedAmount?: number;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'loan_id', type: 'uuid', nullable: true })
  @Index('idx_split_participants_loan_id')
  loanId?: string;

  @ManyToOne(() => Loan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'loan_id' })
  loan?: Loan;

  @Column({ name: 'is_settled', default: false })
  isSettled: boolean;
}
