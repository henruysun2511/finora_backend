import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Language } from '../../users/enums/language.enum';
import { TransactionVisibility } from '../../../common/enums/transaction-visibility.enum';
import { MascotTone } from '../../mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from '../../mascots/enums/mascot-sensitivity.enum';
import { ThemeMode } from '../enums/theme-mode.enum';
import { AiProvider } from '../enums/ai-provider.enum';

@Entity('user_settings')
export class Setting extends BaseEntity {
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

  @Column({
    type: 'enum',
    enum: ThemeMode,
    default: ThemeMode.SYSTEM,
  })
  theme: ThemeMode;

  @Column({ name: 'app_lock_enabled', default: false })
  appLockEnabled: boolean;

  @Column({ name: 'require_pin_for_transactions', default: false })
  requirePinForTransactions: boolean;

  @Column({ name: 'pin_hash', length: 255, nullable: true, select: false })
  pinHash?: string;

  @Column({ name: 'show_mascot', default: true })
  showMascot: boolean;

  @Column({ name: 'current_mascot_tier_id', type: 'uuid', nullable: true })
  currentMascotTierId?: string;

  @Column({
    name: 'mascot_tone',
    type: 'enum',
    enum: MascotTone,
    default: MascotTone.BALANCED,
  })
  mascotTone: MascotTone;

  @Column({
    name: 'mascot_sensitivity',
    type: 'enum',
    enum: MascotSensitivity,
    default: MascotSensitivity.ANOMALIES_ONLY,
  })
  mascotSensitivity: MascotSensitivity;

  @Column({
    name: 'ai_provider',
    type: 'enum',
    enum: AiProvider,
    default: AiProvider.GEMINI,
  })
  aiProvider: AiProvider;

  @Column({ name: 'ai_api_key', length: 255, nullable: true, select: false })
  aiApiKey?: string;

  @Column({ name: 'ai_model', length: 100, nullable: true })
  aiModel?: string;

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

export { Setting as UserSetting };
