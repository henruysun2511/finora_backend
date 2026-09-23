import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DirectMessageType } from '../../../common/enums/direct-message-type.enum';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import type { MessageReaction } from './message-reaction.entity';

@Entity('direct_messages')
export class DirectMessage extends BaseEntity {
  @Column({ name: 'sender_id', type: 'uuid' })
  @Index()
  senderId: string;

  @ManyToOne(() => User, (user) => user.sentDirectMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'receiver_id', type: 'uuid' })
  @Index()
  receiverId: string;

  @ManyToOne(() => User, (user) => user.receivedDirectMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({
    type: 'enum',
    enum: DirectMessageType,
    default: DirectMessageType.TEXT,
  })
  type: DirectMessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_url', length: 500, nullable: true })
  mediaUrl?: string;

  @Column({ name: 'reply_to_message_id', type: 'uuid', nullable: true })
  @Index()
  replyToMessageId?: string;

  @ManyToOne(() => DirectMessage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyToMessage?: DirectMessage;

  @Column({ name: 'related_transaction_id', type: 'uuid', nullable: true })
  @Index()
  relatedTransactionId?: string;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'related_transaction_id' })
  relatedTransaction?: Transaction;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({
    name: 'read_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  readAt?: Date;

  @Column({ name: 'deleted_for_sender', default: false })
  deletedForSender: boolean;

  @Column({ name: 'deleted_for_receiver', default: false })
  deletedForReceiver: boolean;

  @OneToMany('MessageReaction', 'message')
  reactions: MessageReaction[];
}
