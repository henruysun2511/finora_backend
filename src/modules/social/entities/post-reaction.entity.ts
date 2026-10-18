import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReactionEmoji } from '../../../modules/social/enums/reaction-emoji.enum';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('post_reactions')
@Unique(['transactionId', 'userId'])
export class PostReaction extends BaseEntity {
  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index('idx_post_reactions_transaction_id')
  transactionId: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_post_reactions_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ReactionEmoji,
  })
  emoji: ReactionEmoji;
}
