import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('receipts')
export class Receipt extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_receipts_account_id')
  accountId: string;

  @ManyToOne(() => Account, (account) => account.receipts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string;

  @Column({ name: 'merchant_name', length: 150, nullable: true })
  merchantName?: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  totalAmount: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  taxAmount?: number;

  @Column({
    name: 'tip_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  tipAmount?: number;

  @Column({ name: 'items_raw_json', type: 'jsonb', nullable: true })
  itemsRawJson?: Record<string, any>[];

  @CreateDateColumn({ name: 'scanned_at', type: 'timestamptz' })
  scannedAt: Date;

  @OneToMany('Transaction', 'receipt')
  transactions: any[];
}
