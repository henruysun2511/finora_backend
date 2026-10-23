import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ChatRole } from '../enums/chat-role.enum';
import { ChatMessageType } from '../enums/chat-message-type.enum';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

@Entity('chat_messages')
export class ChatMessage extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_chat_messages_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_chat_messages_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: ChatRole,
  })
  role: ChatRole;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  messageType: ChatMessageType;

  @Column({ name: 'text_content', type: 'text' })
  textContent: string;

  @Column({ length: 50, nullable: true })
  intent?: string | null;

  @Column({ length: 50, nullable: true })
  mascot?: string | null;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payloadJson?: Record<string, any>;
}
