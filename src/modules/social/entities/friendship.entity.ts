import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { FriendshipStatus } from '../../../common/enums/friendship-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('friendships')
@Unique(['requesterId', 'addresseeId'])
export class Friendship extends BaseEntity {
  @Column({ name: 'requester_id', type: 'uuid' })
  @Index()
  requesterId: string;

  @ManyToOne(() => User, (user) => user.friendshipsRequested, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'addressee_id', type: 'uuid' })
  @Index()
  addresseeId: string;

  @ManyToOne(() => User, (user) => user.friendshipsReceived, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressee_id' })
  addressee: User;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;
}
