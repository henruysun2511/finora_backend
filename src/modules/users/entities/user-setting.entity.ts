import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { Language } from '../enums/language.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';

@Entity('user_settings')
export class UserSetting extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index('idx_user_settings_user_id')
  userId: string;

  @OneToOne(() => User, (user) => user.setting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'default_currency', length: 3, default: 'VND' })
  defaultCurrency: string;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.VI,
  })
  language: Language;

  @Column({ name: 'app_lock_enabled', default: false })
  appLockEnabled: boolean;

  @Column({ name: 'pin_hash', length: 255, nullable: true, select: false })
  pinHash?: string;

  @Column({ name: 'show_mascot', default: true })
  showMascot: boolean;

  @Column({ name: 'biometric_enabled', default: false })
  biometricEnabled: boolean;

  @Column({
    name: 'default_transaction_visibility',
    type: 'enum',
    enum: TransactionVisibility,
    default: TransactionVisibility.PRIVATE,
  })
  defaultTransactionVisibility: TransactionVisibility;

  @Column({ name: 'default_amount_hidden', default: true })
  defaultAmountHidden: boolean;

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  notificationPreferences?: Record<string, unknown>;
}
