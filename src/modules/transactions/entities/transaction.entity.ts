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
import { Account } from '../../accounts/entities/account.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { Receipt } from './receipt.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';


@Entity('transactions')
@Index('idx_transactions_account_id', ['accountId'])
@Index('idx_transactions_created_by', ['createdBy'])
@Index('idx_transactions_category_id', ['categoryId'])
@Index('idx_transactions_transaction_date', ['transactionDate'])
export class Transaction extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'receipt_id', type: 'uuid', nullable: true })
  receiptId?: string | null;

  @ManyToOne(() => Receipt, (receipt) => receipt.transactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt?: Receipt | null;

  @Column({ name: 'chat_message_id', type: 'uuid', nullable: true })
  chatMessageId?: string | null;

  @Column({ name: 'recurring_transaction_id', type: 'uuid', nullable: true })
  recurringTransactionId?: string | null;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

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

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  fee: number;

  @Column({ name: 'exclude_from_report', default: false })
  excludeFromReport: boolean;

  @Column({ name: 'location_name', length: 255, nullable: true })
  locationName?: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  latitude?: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  longitude?: number | null;

  @Column({ name: 'photo_url', length: 500, nullable: true })
  photoUrl?: string | null;

  @Column({
    name: 'photo_type',
    type: 'enum',
    enum: PhotoType,
    nullable: true,
  })
  photoType?: PhotoType | null;

  @Column({
    name: 'transaction_date',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  transactionDate: Date;

  @OneToMany('PostReaction', 'transaction')
  reactions?: any[];

  @OneToOne('ExpenseSplit', 'transaction')
  split?: any;
}
