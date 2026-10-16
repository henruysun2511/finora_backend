import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DirectMessage } from './direct-message.entity';
import { User } from '../../users/entities/user.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId'])
export class MessageReaction extends BaseEntity {
  @Column({ name: 'message_id', type: 'uuid' })
  @Index()
  messageId: string;

  @ManyToOne(() => DirectMessage, (message) => message.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: DirectMessage;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.messageReactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20 })
  emoji: string;
}
