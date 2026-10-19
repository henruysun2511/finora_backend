import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import type { MessageReaction } from './message-reaction.entity';

@Entity('direct_messages')
export class DirectMessage extends BaseEntity {
  @Column({ name: 'sender_id', type: 'uuid' })
  @Index('idx_direct_messages_sender_id')
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'receiver_id', type: 'uuid' })
  @Index('idx_direct_messages_receiver_id')
  receiverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'reply_to_message_id', type: 'uuid', nullable: true })
  @Index('idx_direct_messages_reply_to_id')
  replyToMessageId?: string;

  @ManyToOne(() => DirectMessage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyToMessage?: DirectMessage;

  @Column({ name: 'related_transaction_id', type: 'uuid', nullable: true })
  @Index('idx_direct_messages_related_transaction_id')
  relatedTransactionId?: string;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'related_transaction_id' })
  relatedTransaction?: Transaction | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @OneToMany('MessageReaction', 'message')
  reactions: MessageReaction[];
}
