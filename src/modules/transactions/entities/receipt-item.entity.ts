import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Receipt } from './receipt.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('receipt_items')
export class ReceiptItem extends BaseEntity {
  @Column({ name: 'receipt_id', type: 'uuid' })
  @Index()
  receiptId: string;

  @ManyToOne(() => Receipt, (receipt) => receipt.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @Column({ name: 'item_name', length: 200 })
  itemName: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    default: 1,
  })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalPrice: number;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  @Index()
  categoryId?: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;
}
