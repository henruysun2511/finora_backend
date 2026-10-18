// src/modules/transfers/entities/transfer.entity.ts
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
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('transfers')
export class Transfer extends BaseEntity {
  @Column({ name: 'from_account_id', type: 'uuid' })
  @Index('idx_transfers_from_account_id')
  fromAccountId: string;

  @ManyToOne(() => Account, (account) => account.outgoingTransfers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account;

  @Column({ name: 'to_account_id', type: 'uuid' })
  @Index('idx_transfers_to_account_id')
  toAccountId: string;

  @ManyToOne(() => Account, (account) => account.incomingTransfers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index('idx_transfers_created_by')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'fee_account_id', type: 'uuid', nullable: true })
  @Index('idx_transfers_fee_account_id')
  feeAccountId?: string | null;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fee_account_id' })
  feeAccount?: Account | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  fee: number;

  @Column({
    name: 'from_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  fromAmount: number;

  @Column({ name: 'from_currency', length: 10, default: 'VND' })
  fromCurrency: string;

  @Column({
    name: 'to_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  toAmount: number;

  @Column({ name: 'to_currency', length: 10, default: 'VND' })
  toCurrency: string;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 15,
    scale: 6,
    default: 1,
    transformer: new DecimalTransformer(),
  })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({
    name: 'transfer_date',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_transfers_transfer_date')
  transferDate: Date;
}
