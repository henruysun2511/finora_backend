import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { FriendshipStatus } from '../enums/friendship-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('friendships')
@Unique(['requesterId', 'addresseeId'])
@Index('idx_friendships_requester_addressee', ['requesterId', 'addresseeId'])
export class Friendship extends BaseEntity {
  @Column({ name: 'requester_id', type: 'uuid' })
  @Index('idx_friendships_requester_id')
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'addressee_id', type: 'uuid' })
  @Index('idx_friendships_addressee_id')
  addresseeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressee_id' })
  addressee: User;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;
}
