import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import type { Transaction } from './transaction.entity';

@Entity('receipts')
export class Receipt extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string;

  @Column({ name: 'merchant_name', length: 200, nullable: true })
  merchantName?: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  taxAmount?: number;

  @Column({
    name: 'tip_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  tipAmount?: number;

  @Column({ name: 'ocr_raw_data', type: 'jsonb', nullable: true })
  ocrRawData?: Record<string, any>;

  @Column({
    name: 'scanned_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  scannedAt: Date;

  @OneToMany('Transaction', 'receipt')
  transactions: Transaction[];

  @OneToMany('ReceiptItem', 'receipt')
  items: any[];
}
