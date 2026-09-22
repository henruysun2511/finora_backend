import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';
import type { UserRole } from '../../users/entities/user-role.entity';
import type { GroupMember } from '../../groups/entities/group-member.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true, length: 100 })
  @Index()
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;

  @Column({ name: 'is_sys_admin', default: false })
  isSysAdmin: boolean;


  @OneToMany('UserRole', 'role')
  userRoles: UserRole[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  @OneToMany('GroupMember', 'role')
  groupMembers: GroupMember[];
}

