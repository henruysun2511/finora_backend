import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';
import { TransactionSource } from '../enums/transaction-source.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { PhotoType } from '../enums/photo-type.enum';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Account } from '../../accounts/entities/account.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import type { Receipt } from './receipt.entity';

@Entity('transactions')
@Index('idx_transactions_account_date', ['accountId', 'date'])
export class Transaction extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_transactions_account_id')
  accountId: string;

  @ManyToOne(() => Account, (account) => account.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_transactions_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  @Index('idx_transactions_category_id')
  categoryId?: string;

  @ManyToOne(() => Category, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ name: 'receipt_id', type: 'uuid', nullable: true })
  @Index('idx_transactions_receipt_id')
  receiptId?: string;

  @ManyToOne('Receipt', 'transactions', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt?: Receipt;

  @Column({ name: 'chat_message_id', type: 'uuid', nullable: true })
  @Index('idx_transactions_chat_message_id')
  chatMessageId?: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    default: TransactionSource.MANUAL,
  })
  source: TransactionSource;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.CONFIRMED,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionVisibility,
    default: TransactionVisibility.PRIVATE,
  })
  visibility: TransactionVisibility;

  @Column({ name: 'amount_hidden', default: false })
  amountHidden: boolean;

  @Column({ name: 'photo_url', length: 500, nullable: true })
  photoUrl?: string;

  @Column({
    name: 'photo_type',
    type: 'enum',
    enum: PhotoType,
    nullable: true,
  })
  photoType?: PhotoType;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'date' })
  @Index('idx_transactions_date')
  date: string;

  @OneToMany('PostReaction', 'transaction')
  reactions: any[];

  @OneToOne('ExpenseSplit', 'transaction')
  split?: any;
}
