import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSetting extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, (user) => user.setting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'default_currency', length: 10, default: 'VND' })
  defaultCurrency: string;

  @Column({ length: 10, default: 'vi' })
  language: string;

  @Column({ name: 'app_lock_enabled', default: false })
  appLockEnabled: boolean;

  @Column({ name: 'pin_hash', length: 255, nullable: true, select: false })
  pinHash?: string;

  @Column({ name: 'show_mascot', default: true })
  showMascot: boolean;

  @Column({ name: 'biometric_enabled', default: false })
  biometricEnabled: boolean;

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  notificationPreferences?: Record<string, any>;

  @Column({ name: 'default_transaction_visibility', length: 50, default: 'PRIVATE' })
  defaultTransactionVisibility: string;
}
