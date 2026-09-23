import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';

@Entity('transfers')
export class Transfer extends BaseEntity {
  @Column({ name: 'from_account_id', type: 'uuid' })
  @Index()
  fromAccountId: string;

  @ManyToOne(() => Account, (account) => account.outgoingTransfers, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account;

  @Column({ name: 'to_account_id', type: 'uuid' })
  @Index()
  toAccountId: string;

  @ManyToOne(() => Account, (account) => account.incomingTransfers, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'fee_account_id', type: 'uuid', nullable: true })
  @Index()
  feeAccountId?: string;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fee_account_id' })
  feeAccount?: Account;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  fee: number;

  @Column({
    name: 'from_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  fromAmount: number;

  @Column({ name: 'from_currency', length: 10, default: 'VND' })
  fromCurrency: string;

  @Column({
    name: 'to_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  toAmount: number;

  @Column({ name: 'to_currency', length: 10, default: 'VND' })
  toCurrency: string;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 15,
    scale: 6,
    default: 1.0,
  })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    name: 'transfer_date',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  transferDate: Date;
}
