// src/modules/settings/settings.service.ts
import { Injectable, Logger, Optional } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsMapper } from './mapper/settings.mapper';
import { RedisService } from '../../infrastructures/redis/redis.service';
import { Setting } from './entities/setting.entity';
import { UpdateMascotSettingsDto } from './dto/request/update-mascot-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/request/update-general-settings.dto';
import { UpdateNotificationPreferencesDto } from './dto/request/update-notification-preferences.dto';
import { SetupPinDto } from './dto/request/setup-pin.dto';
import { VerifyPinDto } from './dto/request/verify-pin.dto';
import { ChangePinDto } from './dto/request/change-pin.dto';
import { DisableAppLockDto } from './dto/request/disable-app-lock.dto';
import { UserSettingsResponseDto } from './dto/response/user-settings-response.dto';
import { VerifyPinResponseDto } from './dto/response/verify-pin-response.dto';
import {
  PinMismatchException,
  PinAlreadySetException,
  PinNotSetException,
  InvalidPinException,
  PinLockoutException,
  SameNewPinException,
} from './exceptions/settings.exception';
import { SETTINGS_SECURITY_CONFIG } from './settings.constant';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  // Fallback in-memory rate-limiter when Redis is not available
  private readonly memoryAttempts = new Map<
    string,
    { count: number; lockedUntil?: number }
  >();

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly mapper: SettingsMapper,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  /**
   * Lấy hoặc khởi tạo bản ghi cài đặt mặc định cho người dùng
   */
  async getOrCreateSettings(userId: string): Promise<Setting> {
    let setting = await this.settingsRepo.findByUserId(userId);
    if (!setting) {
      setting = this.settingsRepo.create({
        userId,
      });
      setting = await this.settingsRepo.save(setting);
    }
    return setting;
  }

  /**
   * Lấy thông tin cài đặt hiện tại của người dùng
   */
  async getSettings(userId: string): Promise<UserSettingsResponseDto> {
    const settingWithPin = await this.settingsRepo.findByUserIdWithPin(userId);
    if (settingWithPin) {
      return this.mapper.toResponse(settingWithPin, !!settingWithPin.pinHash);
    }
    const created = await this.getOrCreateSettings(userId);
    return this.mapper.toResponse(created, false);
  }

  /**
   * Cập nhật cài đặt linh vật (bật/tắt, tone giọng điệu, độ nhạy)
   */
  async updateMascotSettings(
    userId: string,
    dto: UpdateMascotSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    const setting = await this.getOrCreateSettings(userId);

    if (dto.showMascot !== undefined) {
      setting.showMascot = dto.showMascot;
    }
    if (dto.mascotTone !== undefined) {
      setting.mascotTone = dto.mascotTone;
    }
    if (dto.mascotSensitivity !== undefined) {
      setting.mascotSensitivity = dto.mascotSensitivity;
    }

    const saved = await this.settingsRepo.save(setting);
    return this.mapper.toResponse(saved);
  }

  /**
   * Cập nhật cài đặt chung (ngôn ngữ, tiền tệ, quyền riêng tư mặc định)
   */
  async updateGeneralSettings(
    userId: string,
    dto: UpdateGeneralSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    const setting = await this.getOrCreateSettings(userId);

    if (dto.defaultCurrency !== undefined) {
      setting.defaultCurrency = dto.defaultCurrency.toUpperCase();
    }
    if (dto.language !== undefined) {
      setting.language = dto.language;
    }
    if (dto.theme !== undefined) {
      setting.theme = dto.theme;
    }
    if (dto.defaultTransactionVisibility !== undefined) {
      setting.defaultTransactionVisibility = dto.defaultTransactionVisibility;
    }
    if (dto.defaultAmountHidden !== undefined) {
      setting.defaultAmountHidden = dto.defaultAmountHidden;
    }

    const saved = await this.settingsRepo.save(setting);
    return this.mapper.toResponse(saved);
  }

  /**
   * Cập nhật tùy chọn thông báo
   */
  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<UserSettingsResponseDto> {
    const setting = await this.getOrCreateSettings(userId);

    const currentPreferences = setting.notificationPreferences || {};
    setting.notificationPreferences = {
      ...currentPreferences,
      ...dto,
    };

    const saved = await this.settingsRepo.save(setting);
    return this.mapper.toResponse(saved);
  }

  /**
   * Thiết lập mã PIN bảo mật lần đầu (tự động bật App Lock)
   */
  async setupPin(
    userId: string,
    dto: SetupPinDto,
  ): Promise<UserSettingsResponseDto> {
    if (dto.pin !== dto.confirmPin) {
      throw new PinMismatchException();
    }

    const setting = await this.settingsRepo.findByUserIdWithPin(userId);
    if (setting?.pinHash) {
      throw new PinAlreadySetException();
    }

    const currentSetting = setting || (await this.getOrCreateSettings(userId));
    const salt = await bcrypt.genSalt(SETTINGS_SECURITY_CONFIG.PIN_SALT_ROUNDS);
    currentSetting.pinHash = await bcrypt.hash(dto.pin, salt);
    currentSetting.appLockEnabled = true;

    const saved = await this.settingsRepo.save(currentSetting);
    this.logger.log(`User ${userId} đã thiết lập mã PIN bảo mật thành công`);
    return this.mapper.toResponse(saved, true);
  }

  /**
   * Xác thực mã PIN bảo mật với cơ chế rate-limiting chống Brute-force
   */
  async verifyPin(
    userId: string,
    dto: VerifyPinDto,
  ): Promise<VerifyPinResponseDto> {
    await this.assertNotLockedOut(userId);

    const setting = await this.settingsRepo.findByUserIdWithPin(userId);
    if (!setting || !setting.pinHash) {
      throw new PinNotSetException();
    }

    const isMatch = await bcrypt.compare(dto.pin, setting.pinHash);
    if (!isMatch) {
      const remaining = await this.recordFailedAttempt(userId);
      throw new InvalidPinException(remaining);
    }

    await this.clearFailedAttempts(userId);
    return {
      valid: true,
      message: 'Xác thực mã PIN thành công',
    };
  }

  /**
   * Đổi mã PIN bảo mật
   */
  async changePin(
    userId: string,
    dto: ChangePinDto,
  ): Promise<UserSettingsResponseDto> {
    await this.assertNotLockedOut(userId);

    if (dto.newPin !== dto.confirmNewPin) {
      throw new PinMismatchException();
    }

    if (dto.newPin === dto.oldPin) {
      throw new SameNewPinException();
    }

    const setting = await this.settingsRepo.findByUserIdWithPin(userId);
    if (!setting || !setting.pinHash) {
      throw new PinNotSetException();
    }

    const isMatch = await bcrypt.compare(dto.oldPin, setting.pinHash);
    if (!isMatch) {
      const remaining = await this.recordFailedAttempt(userId);
      throw new InvalidPinException(remaining);
    }

    await this.clearFailedAttempts(userId);

    const salt = await bcrypt.genSalt(SETTINGS_SECURITY_CONFIG.PIN_SALT_ROUNDS);
    setting.pinHash = await bcrypt.hash(dto.newPin, salt);
    const saved = await this.settingsRepo.save(setting);

    this.logger.log(`User ${userId} đã đổi mã PIN bảo mật thành công`);
    return this.mapper.toResponse(saved, true);
  }

  /**
   * Tắt khóa ứng dụng (yêu cầu xác thực mã PIN)
   */
  async disableAppLock(
    userId: string,
    dto: DisableAppLockDto,
  ): Promise<UserSettingsResponseDto> {
    await this.assertNotLockedOut(userId);

    const setting = await this.settingsRepo.findByUserIdWithPin(userId);
    if (!setting || !setting.pinHash) {
      throw new PinNotSetException();
    }

    const isMatch = await bcrypt.compare(dto.pin, setting.pinHash);
    if (!isMatch) {
      const remaining = await this.recordFailedAttempt(userId);
      throw new InvalidPinException(remaining);
    }

    await this.clearFailedAttempts(userId);

    setting.appLockEnabled = false;
    const saved = await this.settingsRepo.save(setting);

    this.logger.log(`User ${userId} đã tắt tính năng khóa ứng dụng`);
    return this.mapper.toResponse(saved, true);
  }

  // ── [RATE LIMITING / LOCKOUT HELPERS] ────────────────────────────────────────

  private async assertNotLockedOut(userId: string): Promise<void> {
    const lockKey = `pin_lockout:${userId}`;
    if (this.redisService?.isReady) {
      const isLocked = await this.redisService.get(lockKey);
      if (isLocked) {
        throw new PinLockoutException();
      }
    } else {
      const mem = this.memoryAttempts.get(userId);
      if (mem?.lockedUntil && mem.lockedUntil > Date.now()) {
        const minutes = Math.ceil((mem.lockedUntil - Date.now()) / (60 * 1000));
        throw new PinLockoutException(minutes);
      }
    }
  }

  private async recordFailedAttempt(userId: string): Promise<number> {
    const attemptsKey = `pin_attempts:${userId}`;
    const lockKey = `pin_lockout:${userId}`;
    const max = SETTINGS_SECURITY_CONFIG.PIN_MAX_ATTEMPTS;

    if (this.redisService?.isReady) {
      const current = ((await this.redisService.get<number>(attemptsKey)) || 0) + 1;
      await this.redisService.set(
        attemptsKey,
        current,
        SETTINGS_SECURITY_CONFIG.PIN_LOCKOUT_TTL_SECONDS,
      );

      if (current >= max) {
        await this.redisService.set(
          lockKey,
          1,
          SETTINGS_SECURITY_CONFIG.PIN_LOCKOUT_TTL_SECONDS,
        );
        throw new PinLockoutException();
      }
      return max - current;
    } else {
      let mem = this.memoryAttempts.get(userId) || { count: 0 };
      mem.count += 1;

      if (mem.count >= max) {
        mem.lockedUntil =
          Date.now() + SETTINGS_SECURITY_CONFIG.PIN_LOCKOUT_TTL_SECONDS * 1000;
        this.memoryAttempts.set(userId, mem);
        throw new PinLockoutException();
      }

      this.memoryAttempts.set(userId, mem);
      return max - mem.count;
    }
  }

  private async clearFailedAttempts(userId: string): Promise<void> {
    if (this.redisService?.isReady) {
      await this.redisService.del(
        `pin_attempts:${userId}`,
        `pin_lockout:${userId}`,
      );
    } else {
      this.memoryAttempts.delete(userId);
    }
  }
}
