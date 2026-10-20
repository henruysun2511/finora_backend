// src/modules/settings/mapper/settings.mapper.ts
import { Injectable } from '@nestjs/common';
import { Setting } from '../entities/setting.entity';
import { UserSettingsResponseDto } from '../dto/response/user-settings-response.dto';

@Injectable()
export class SettingsMapper {
  toResponse(setting: Setting, hasPinOverride?: boolean): UserSettingsResponseDto {
    return {
      defaultCurrency: setting.defaultCurrency,
      language: setting.language,
      appLockEnabled: setting.appLockEnabled,
      hasPin: hasPinOverride !== undefined ? hasPinOverride : !!setting.pinHash,
      biometricEnabled: setting.biometricEnabled,
      showMascot: setting.showMascot,
      mascotTone: setting.mascotTone,
      mascotSensitivity: setting.mascotSensitivity,
      currentMascotTierId: setting.currentMascotTierId || null,
      defaultTransactionVisibility: setting.defaultTransactionVisibility,
      defaultAmountHidden: setting.defaultAmountHidden,
      notificationPreferences: setting.notificationPreferences,
    };
  }
}
