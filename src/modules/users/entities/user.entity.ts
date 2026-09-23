import { Entity, Column, Index, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { UserRole } from './user-role.entity';
import type { Group } from '../../groups/entities/group.entity';
import type { GroupMember } from '../../groups/entities/group-member.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 150 })
  @Index()
  email: string;

  @Column({ length: 255, nullable: true, select: false })
  password?: string;

  @Column({ name: 'google_id', unique: true, nullable: true, length: 100 })
  @Index()
  googleId?: string;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ nullable: true, length: 500 })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany('Group', 'owner')
  ownedGroups: Group[];

  @OneToMany('GroupMember', 'user')
  groupMemberships: GroupMember[];

  @OneToOne('UserSetting', 'user')
  setting?: any;

  @OneToMany('AiPersona', 'user')
  aiPersonas: any[];

  @OneToMany('WalletMember', 'user')
  walletMemberships: any[];

  @OneToMany('Transaction', 'creator')
  createdTransactions: any[];

  @OneToMany('ChatMessage', 'user')
  chatMessages: any[];

  @OneToMany('Notification', 'user')
  notifications: any[];

  @OneToMany('Friendship', 'requester')
  friendshipsRequested: any[];

  @OneToMany('Friendship', 'addressee')
  friendshipsReceived: any[];

  @OneToMany('DirectMessage', 'sender')
  sentDirectMessages: any[];

  @OneToMany('DirectMessage', 'receiver')
  receivedDirectMessages: any[];

  @OneToMany('PostReaction', 'user')
  postReactions: any[];

  @OneToMany('MessageReaction', 'user')
  messageReactions: any[];
}

