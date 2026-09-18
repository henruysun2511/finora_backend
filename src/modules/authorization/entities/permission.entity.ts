import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ unique: true, length: 100 })
  @Index()
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  resource?: string;

  @Column({ length: 100, nullable: true })
  action?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: RolePermission[];
}
