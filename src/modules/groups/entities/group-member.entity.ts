import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Group } from './group.entity';
import { User } from '../../users/entities/user.entity';
import type { Role } from '../../authorization/entities/role.entity';

@Entity('group_members')
@Index(['groupId', 'userId'], { unique: true })
export class GroupMember extends BaseEntity {
  @Column({ name: 'group_id', type: 'uuid' })
  @Index()
  groupId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  @Index()
  roleId: string;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToOne(() => User, (user) => user.groupMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne('Role', 'groupMembers', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
