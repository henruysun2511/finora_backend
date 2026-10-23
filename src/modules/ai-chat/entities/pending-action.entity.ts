import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PendingActionStatus } from '../enums/pending-action-status.enum';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

@Entity('pending_actions')
export class PendingAction extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_pending_actions_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_pending_actions_wallet_id')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'tool_name', length: 100 })
  toolName: string;

  @Column({ name: 'tool_input', type: 'jsonb' })
  toolInput: Record<string, any>;

  @Column({ name: 'preview_payload', type: 'jsonb' })
  previewPayload: Record<string, any>;

  @Column({ name: 'chat_message_id', type: 'uuid', nullable: true })
  @Index('idx_pending_actions_chat_message_id')
  chatMessageId?: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index('idx_pending_actions_transaction_id')
  transactionId?: string | null;

  @Column({
    type: 'enum',
    enum: PendingActionStatus,
    default: PendingActionStatus.PENDING,
  })
  @Index('idx_pending_actions_status')
  status: PendingActionStatus;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
  })
  @Index('idx_pending_actions_expires_at')
  expiresAt: Date;
}
