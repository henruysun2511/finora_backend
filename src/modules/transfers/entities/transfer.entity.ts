import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

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

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 12,
    scale: 6,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  exchangeRate?: number;

  @Column({ type: 'date' })
  @Index('idx_transfers_date')
  date: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}
