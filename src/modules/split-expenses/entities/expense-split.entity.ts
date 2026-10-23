import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SplitType } from '../enums/split-type.enum';
import { SplitStatus } from '../enums/split-status.enum';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expense_splits')
export class ExpenseSplit extends BaseEntity {
  @Column({ name: 'transaction_id', type: 'uuid', unique: true })
  @Index('idx_expense_splits_transaction_id')
  transactionId: string;

  @OneToOne(() => Transaction, (transaction) => transaction.split, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_expense_splits_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'created_by_id', type: 'uuid' })
  @Index('idx_expense_splits_created_by_id')
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  totalAmount: number;

  @Column({
    name: 'split_type',
    type: 'enum',
    enum: SplitType,
    default: SplitType.EQUAL,
  })
  splitType: SplitType;

  @Column({
    type: 'enum',
    enum: SplitStatus,
    default: SplitStatus.PENDING,
  })
  status: SplitStatus;

  @OneToMany('SplitParticipant', 'split')
  participants: any[];
}
