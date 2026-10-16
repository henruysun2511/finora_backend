import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionSource } from '../../../common/enums/transaction-source.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Receipt } from './receipt.entity';
import { TransactionPhoto } from './transaction-photo.entity';
import type { RecurringTransaction } from '../../recurring-transactions/entities/recurring-transaction.entity';
import type { ChatMessage } from '../../chat/entities/chat-message.entity';
import type { PostReaction } from '../../social/entities/post-reaction.entity';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @ManyToOne(() => Account, (account) => account.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy: string;

  @ManyToOne(() => User, (user) => user.createdTransactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index()
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'receipt_id', type: 'uuid', nullable: true })
  @Index()
  receiptId?: string;

  @ManyToOne(() => Receipt, (receipt) => receipt.transactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt?: Receipt;

  @Column({ name: 'chat_message_id', type: 'uuid', nullable: true })
  @Index()
  chatMessageId?: string;

  @ManyToOne('ChatMessage', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'chat_message_id' })
  chatMessage?: ChatMessage;

  @Column({ name: 'recurring_transaction_id', type: 'uuid', nullable: true })
  @Index()
  recurringTransactionId?: string;

  @ManyToOne('RecurringTransaction', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recurring_transaction_id' })
  recurringTransaction?: RecurringTransaction;

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
  })
  amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

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
  })
  fee: number;

  @Column({ name: 'exclude_from_report', default: false })
  excludeFromReport: boolean;

  @Column({ name: 'location_name', length: 255, nullable: true })
  locationName?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude?: number;

  @Column({
    name: 'transaction_date',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  transactionDate: Date;

  @OneToMany(() => TransactionPhoto, (photo) => photo.transaction)
  photos: TransactionPhoto[];

  @OneToMany('PostReaction', 'transaction')
  reactions: PostReaction[];
}
