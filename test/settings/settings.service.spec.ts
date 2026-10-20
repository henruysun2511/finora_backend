// test/settings/settings.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { SettingsRepository } from '../../src/modules/settings/repositories/settings.repository';
import { SettingsMapper } from '../../src/modules/settings/mapper/settings.mapper';
import { RedisService } from '../../src/infrastructures/redis/redis.service';
import { Setting } from '../../src/modules/settings/entities/setting.entity';
import { Language } from '../../src/modules/users/enums/language.enum';
import { TransactionVisibility } from '../../src/common/enums/transaction-visibility.enum';
import { MascotTone } from '../../src/modules/mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from '../../src/modules/mascots/enums/mascot-sensitivity.enum';
import { ThemeMode } from '../../src/modules/settings/enums/theme-mode.enum';
import { AiProvider } from '../../src/modules/settings/enums/ai-provider.enum';
import {
  PinMismatchException,
  PinAlreadySetException,
  PinNotSetException,
  InvalidPinException,
  PinLockoutException,
  SameNewPinException,
} from '../../src/modules/settings/exceptions/settings.exception';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockSetting: Setting;

  const mockSettingsRepo = {
    create: jest.fn().mockImplementation((dto) => ({
      id: 'setting-1',
      defaultCurrency: 'VND',
      language: Language.VI,
      theme: ThemeMode.SYSTEM,
      aiProvider: AiProvider.GEMINI,
      aiApiKey: undefined,
      aiModel: undefined,
      appLockEnabled: false,
      showMascot: true,
      mascotTone: MascotTone.BALANCED,
      mascotSensitivity: MascotSensitivity.ANOMALIES_ONLY,
      defaultTransactionVisibility: TransactionVisibility.PRIVATE,
      defaultAmountHidden: true,
      ...dto,
    })),
    save: jest.fn().mockImplementation((setting) => Promise.resolve(setting)),
    findByUserId: jest.fn(),
    findByUserIdWithPin: jest.fn(),
    findByUserIdWithAiKey: jest.fn(),
    updateByUserId: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    isReady: true,
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    mockSetting = {
      id: 'setting-1',
      userId: 'user-1',
      defaultCurrency: 'VND',
      language: Language.VI,
      theme: ThemeMode.SYSTEM,
      aiProvider: AiProvider.GEMINI,
      aiApiKey: undefined,
      aiModel: undefined,
      appLockEnabled: false,
      pinHash: undefined,
      showMascot: true,
      mascotTone: MascotTone.BALANCED,
      mascotSensitivity: MascotSensitivity.ANOMALIES_ONLY,
      currentMascotTierId: null as any,
      defaultTransactionVisibility: TransactionVisibility.PRIVATE,
      defaultAmountHidden: true,
      notificationPreferences: {
        pushNotifications: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        SettingsMapper,
        {
          provide: SettingsRepository,
          useValue: mockSettingsRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();

    mockSettingsRepo.save.mockImplementation((setting) => Promise.resolve({ ...setting }));
    mockSettingsRepo.create.mockImplementation((dto) => ({
      id: 'setting-1',
      defaultCurrency: 'VND',
      language: Language.VI,
      theme: ThemeMode.SYSTEM,
      aiProvider: AiProvider.GEMINI,
      aiApiKey: undefined,
      aiModel: undefined,
      appLockEnabled: false,
      showMascot: true,
      mascotTone: MascotTone.BALANCED,
      mascotSensitivity: MascotSensitivity.ANOMALIES_ONLY,
      defaultTransactionVisibility: TransactionVisibility.PRIVATE,
      defaultAmountHidden: true,
      ...dto,
    }));
  });

  describe('getSettings', () => {
    it('should return settings for user', async () => {
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({ ...mockSetting });

      const result = await service.getSettings('user-1');

      expect(result.defaultCurrency).toBe('VND');
      expect(result.theme).toBe(ThemeMode.SYSTEM);
      expect(result.aiProvider).toBe(AiProvider.GEMINI);
      expect(result.hasCustomApiKey).toBe(false);
      expect(result.showMascot).toBe(true);
      expect(result.mascotTone).toBe(MascotTone.BALANCED);
      expect(result.hasPin).toBe(false);
    });

    it('should create default settings if user has none', async () => {
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue(null);
      mockSettingsRepo.findByUserId.mockResolvedValue(null);
      mockSettingsRepo.save.mockResolvedValue({ ...mockSetting });

      const result = await service.getSettings('user-1');

      expect(mockSettingsRepo.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result.defaultCurrency).toBe('VND');
    });
  });

  describe('updateMascotSettings', () => {
    it('should update mascot show, tone, and sensitivity', async () => {
      mockSettingsRepo.findByUserId.mockResolvedValue({ ...mockSetting });

      const result = await service.updateMascotSettings('user-1', {
        showMascot: false,
        mascotTone: MascotTone.GENTLE,
        mascotSensitivity: MascotSensitivity.SILENT,
      });

      expect(result.showMascot).toBe(false);
      expect(result.mascotTone).toBe(MascotTone.GENTLE);
      expect(result.mascotSensitivity).toBe(MascotSensitivity.SILENT);
      expect(mockSettingsRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateGeneralSettings', () => {
    it('should update currency, language, and theme', async () => {
      mockSettingsRepo.findByUserId.mockResolvedValue({ ...mockSetting });

      const result = await service.updateGeneralSettings('user-1', {
        defaultCurrency: 'usd',
        language: Language.EN,
        theme: ThemeMode.DARK,
        defaultAmountHidden: false,
      });

      expect(result.defaultCurrency).toBe('USD');
      expect(result.language).toBe(Language.EN);
      expect(result.theme).toBe(ThemeMode.DARK);
      expect(result.defaultAmountHidden).toBe(false);
    });
  });

  describe('updateAiSettings', () => {
    it('should update provider, custom model and custom api key', async () => {
      mockSettingsRepo.findByUserIdWithAiKey.mockResolvedValue({ ...mockSetting });

      const result = await service.updateAiSettings('user-1', {
        provider: AiProvider.OPENAI,
        model: 'gpt-4o',
        apiKey: 'sk-proj-1234567890abcdef',
      });

      expect(result.aiProvider).toBe(AiProvider.OPENAI);
      expect(result.aiModel).toBe('gpt-4o');
      expect(result.hasCustomApiKey).toBe(true);
      expect(result.maskedApiKey).toContain('****');
    });

    it('should clear custom api key when empty string provided', async () => {
      mockSettingsRepo.findByUserIdWithAiKey.mockResolvedValue({
        ...mockSetting,
        aiApiKey: 'sk-old-key',
      });

      const result = await service.updateAiSettings('user-1', {
        apiKey: '',
      });

      expect(result.hasCustomApiKey).toBe(false);
      expect(result.maskedApiKey).toBeNull();
    });
  });

  describe('deleteCustomApiKey', () => {
    it('should remove custom api key and fallback to false', async () => {
      mockSettingsRepo.findByUserIdWithAiKey.mockResolvedValue({
        ...mockSetting,
        aiApiKey: 'sk-custom-key',
      });

      const result = await service.deleteCustomApiKey('user-1');

      expect(result.hasCustomApiKey).toBe(false);
      expect(result.maskedApiKey).toBeNull();
    });
  });

  describe('getEffectiveAiConfig', () => {
    it('should return custom api key when configured by user', async () => {
      mockSettingsRepo.findByUserIdWithAiKey.mockResolvedValue({
        ...mockSetting,
        aiProvider: AiProvider.OPENAI,
        aiModel: 'gpt-4o-custom',
        aiApiKey: 'sk-user-custom-key',
      });

      const config = await service.getEffectiveAiConfig('user-1');

      expect(config.provider).toBe(AiProvider.OPENAI);
      expect(config.apiKey).toBe('sk-user-custom-key');
      expect(config.model).toBe('gpt-4o-custom');
      expect(config.isCustomKey).toBe(true);
    });

    it('should return system fallback key when user has no custom key', async () => {
      mockSettingsRepo.findByUserIdWithAiKey.mockResolvedValue({
        ...mockSetting,
        aiProvider: AiProvider.GEMINI,
        aiApiKey: undefined,
      });

      const config = await service.getEffectiveAiConfig('user-1');

      expect(config.provider).toBe(AiProvider.GEMINI);
      expect(config.isCustomKey).toBe(false);
      expect(config.model).toBeDefined();
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should merge notification preferences', async () => {
      mockSettingsRepo.findByUserId.mockResolvedValue({ ...mockSetting });

      const result = await service.updateNotificationPreferences('user-1', {
        emailNotifications: false,
        budgetAlerts: true,
      });

      expect(result.notificationPreferences).toEqual({
        pushNotifications: true,
        emailNotifications: false,
        budgetAlerts: true,
      });
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return notification preferences for user', async () => {
      mockSettingsRepo.findByUserId.mockResolvedValue({
        ...mockSetting,
        notificationPreferences: {
          budgetAlerts: false,
        },
      });

      const prefs = await service.getNotificationPreferences('user-1');

      expect(prefs).toEqual({ budgetAlerts: false });
    });

    it('should return null when user has no settings or no preferences', async () => {
      mockSettingsRepo.findByUserId.mockResolvedValue(null);

      const prefs = await service.getNotificationPreferences('user-1');

      expect(prefs).toBeNull();
    });
  });

  describe('setupPin', () => {
    it('should throw PinMismatchException when pin and confirmPin do not match', async () => {
      await expect(
        service.setupPin('user-1', { pin: '123456', confirmPin: '654321' }),
      ).rejects.toThrow(PinMismatchException);
    });

    it('should throw PinAlreadySetException when user already has a pin', async () => {
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({
        ...mockSetting,
        pinHash: 'already-hashed-pin',
      });

      await expect(
        service.setupPin('user-1', { pin: '123456', confirmPin: '123456' }),
      ).rejects.toThrow(PinAlreadySetException);
    });

    it('should hash pin and enable appLock', async () => {
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({ ...mockSetting });

      const result = await service.setupPin('user-1', {
        pin: '123456',
        confirmPin: '123456',
      });

      expect(result.hasPin).toBe(true);
      expect(result.appLockEnabled).toBe(true);
      expect(mockSettingsRepo.save).toHaveBeenCalled();
    });
  });

  describe('verifyPin', () => {
    it('should throw PinNotSetException if pin is not configured', async () => {
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({ ...mockSetting });

      await expect(
        service.verifyPin('user-1', { pin: '123456' }),
      ).rejects.toThrow(PinNotSetException);
    });

    it('should throw PinLockoutException if user is locked out in Redis', async () => {
      mockRedisService.get.mockResolvedValue('1');

      await expect(
        service.verifyPin('user-1', { pin: '123456' }),
      ).rejects.toThrow(PinLockoutException);
    });

    it('should throw InvalidPinException on incorrect pin and record attempt', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      mockRedisService.get.mockResolvedValue(null);
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({
        ...mockSetting,
        pinHash: hashedPin,
      });

      await expect(
        service.verifyPin('user-1', { pin: '000000' }),
      ).rejects.toThrow(InvalidPinException);

      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should verify pin successfully and clear attempts', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      mockRedisService.get.mockResolvedValue(null);
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({
        ...mockSetting,
        pinHash: hashedPin,
      });

      const result = await service.verifyPin('user-1', { pin: '123456' });

      expect(result.valid).toBe(true);
      expect(mockRedisService.del).toHaveBeenCalled();
    });
  });

  describe('changePin', () => {
    it('should throw PinMismatchException when newPin does not match confirmNewPin', async () => {
      await expect(
        service.changePin('user-1', {
          oldPin: '123456',
          newPin: '654321',
          confirmNewPin: '999999',
        }),
      ).rejects.toThrow(PinMismatchException);
    });

    it('should throw SameNewPinException when newPin equals oldPin', async () => {
      await expect(
        service.changePin('user-1', {
          oldPin: '123456',
          newPin: '123456',
          confirmNewPin: '123456',
        }),
      ).rejects.toThrow(SameNewPinException);
    });

    it('should change pin successfully', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      mockRedisService.get.mockResolvedValue(null);
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({
        ...mockSetting,
        pinHash: hashedPin,
      });

      const result = await service.changePin('user-1', {
        oldPin: '123456',
        newPin: '654321',
        confirmNewPin: '654321',
      });

      expect(result.hasPin).toBe(true);
      expect(mockSettingsRepo.save).toHaveBeenCalled();
    });
  });

  describe('disableAppLock', () => {
    it('should disable appLock when pin is verified', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      mockRedisService.get.mockResolvedValue(null);
      mockSettingsRepo.findByUserIdWithPin.mockResolvedValue({
        ...mockSetting,
        appLockEnabled: true,
        pinHash: hashedPin,
      });

      const result = await service.disableAppLock('user-1', { pin: '123456' });

      expect(result.appLockEnabled).toBe(false);
    });
  });
});
