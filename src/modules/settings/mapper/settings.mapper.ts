// src/modules/settings/mapper/settings.mapper.ts
import { Injectable } from '@nestjs/common';
import { Setting } from '../entities/setting.entity';
import { UserSettingsResponseDto } from '../dto/response/user-settings-response.dto';

@Injectable()
export class SettingsMapper {
  toResponse(setting: Setting, hasPinOverride?: boolean): UserSettingsResponseDto {
    const hasCustomApiKey = Boolean(setting.aiApiKey && setting.aiApiKey.length > 0);

    return {
      defaultCurrency: setting.defaultCurrency,
      language: setting.language,
      theme: setting.theme,
      appLockEnabled: setting.appLockEnabled,
      requirePinForTransactions: setting.requirePinForTransactions ?? false,
      hasPin: hasPinOverride !== undefined ? hasPinOverride : !!setting.pinHash,
      showMascot: setting.showMascot,
      mascotTone: setting.mascotTone,
      mascotSensitivity: setting.mascotSensitivity,
      currentMascotTierId: setting.currentMascotTierId || null,
      aiProvider: setting.aiProvider,
      aiModel: setting.aiModel || null,
      hasCustomApiKey,
      maskedApiKey: this.maskApiKey(setting.aiApiKey),
      defaultTransactionVisibility: setting.defaultTransactionVisibility,
      defaultAmountHidden: setting.defaultAmountHidden,
      notificationPreferences: setting.notificationPreferences,
    };
  }

  private maskApiKey(key?: string): string | null {
    if (!key || key.trim().length === 0) {
      return null;
    }
    const trimmed = key.trim();
    if (trimmed.length <= 8) {
      return '****';
    }
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-4);
    return `${prefix}...****${suffix}`;
  }
}
