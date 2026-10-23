import { Entity, Column, Index, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
import { UserStatus } from '../../../modules/users/enums/user-status.enum';
import { UserRole } from './user-role.entity';
import type { Wallet } from '../../wallets/entities/wallet.entity';
import type { WalletMember } from '../../wallets/entities/wallet-member.entity';
import type { UserSetting } from './user-setting.entity';
import type { AiPersona } from './ai-persona.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 100, nullable: true })
  @Index('idx_users_username')
  username?: string;

  @Column({ unique: true, length: 150 })
  @Index('idx_users_email')
  email: string;

  @Column({ length: 255, nullable: true, select: false })
  password?: string;

  @Column({ name: 'google_id', unique: true, nullable: true, length: 100 })
  @Index('idx_users_google_id')
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

  @OneToOne('UserSetting', 'user', { cascade: true })
  setting?: UserSetting;

  @OneToOne('AiPersona', 'user', { cascade: true })
  persona?: AiPersona;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany('Wallet', 'owner')
  wallets: Wallet[];

  @OneToMany('WalletMember', 'user')
  walletMemberships: WalletMember[];
}
