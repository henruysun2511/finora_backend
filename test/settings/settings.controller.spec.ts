// test/settings/settings.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SettingsController } from '../../src/modules/settings/settings.controller';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { UserSettingsResponseDto } from '../../src/modules/settings/dto/response/user-settings-response.dto';
import { VerifyPinResponseDto } from '../../src/modules/settings/dto/response/verify-pin-response.dto';
import { Language } from '../../src/modules/users/enums/language.enum';
import { TransactionVisibility } from '../../src/common/enums/transaction-visibility.enum';
import { MascotTone } from '../../src/modules/mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from '../../src/modules/mascots/enums/mascot-sensitivity.enum';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockSettingsResponse: UserSettingsResponseDto = {
    defaultCurrency: 'VND',
    language: Language.VI,
    appLockEnabled: false,
    hasPin: false,
    biometricEnabled: false,
    showMascot: true,
    mascotTone: MascotTone.BALANCED,
    mascotSensitivity: MascotSensitivity.ANOMALIES_ONLY,
    currentMascotTierId: null,
    defaultTransactionVisibility: TransactionVisibility.PRIVATE,
    defaultAmountHidden: true,
    notificationPreferences: {
      pushNotifications: true,
    },
  };

  const mockVerifyPinResponse: VerifyPinResponseDto = {
    valid: true,
    message: 'Xác thực mã PIN thành công',
  };

  const mockSettingsService = {
    getSettings: jest.fn().mockResolvedValue(mockSettingsResponse),
    updateMascotSettings: jest.fn().mockResolvedValue(mockSettingsResponse),
    updateGeneralSettings: jest.fn().mockResolvedValue(mockSettingsResponse),
    updateNotificationPreferences: jest.fn().mockResolvedValue(mockSettingsResponse),
    setupPin: jest.fn().mockResolvedValue({ ...mockSettingsResponse, hasPin: true, appLockEnabled: true }),
    verifyPin: jest.fn().mockResolvedValue(mockVerifyPinResponse),
    changePin: jest.fn().mockResolvedValue({ ...mockSettingsResponse, hasPin: true }),
    disableAppLock: jest.fn().mockResolvedValue({ ...mockSettingsResponse, appLockEnabled: false }),
    toggleBiometric: jest.fn().mockResolvedValue({ ...mockSettingsResponse, biometricEnabled: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return user settings with status 200', async () => {
      const result = await controller.getSettings('user-1');

      expect(mockSettingsService.getSettings).toHaveBeenCalledWith('user-1');
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.defaultCurrency).toBe('VND');
    });
  });

  describe('updateMascotSettings', () => {
    it('should update mascot settings with status 200', async () => {
      const dto = {
        showMascot: true,
        mascotTone: MascotTone.GENTLE,
      };

      const result = await controller.updateMascotSettings('user-1', dto);

      expect(mockSettingsService.updateMascotSettings).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('updateGeneralSettings', () => {
    it('should update general settings with status 200', async () => {
      const dto = {
        defaultCurrency: 'USD',
        language: Language.EN,
      };

      const result = await controller.updateGeneralSettings('user-1', dto);

      expect(mockSettingsService.updateGeneralSettings).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences with status 200', async () => {
      const dto = {
        pushNotifications: false,
      };

      const result = await controller.updateNotificationPreferences('user-1', dto);

      expect(mockSettingsService.updateNotificationPreferences).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('setupPin', () => {
    it('should setup pin with status 201', async () => {
      const dto = {
        pin: '123456',
        confirmPin: '123456',
      };

      const result = await controller.setupPin('user-1', dto);

      expect(mockSettingsService.setupPin).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.CREATED);
    });
  });

  describe('verifyPin', () => {
    it('should verify pin with status 200', async () => {
      const dto = {
        pin: '123456',
      };

      const result = await controller.verifyPin('user-1', dto);

      expect(mockSettingsService.verifyPin).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.valid).toBe(true);
    });
  });

  describe('changePin', () => {
    it('should change pin with status 200', async () => {
      const dto = {
        oldPin: '123456',
        newPin: '654321',
        confirmNewPin: '654321',
      };

      const result = await controller.changePin('user-1', dto);

      expect(mockSettingsService.changePin).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('disableAppLock', () => {
    it('should disable app lock with status 200', async () => {
      const dto = {
        pin: '123456',
      };

      const result = await controller.disableAppLock('user-1', dto);

      expect(mockSettingsService.disableAppLock).toHaveBeenCalledWith('user-1', dto);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });

  describe('toggleBiometric', () => {
    it('should toggle biometric with status 200', async () => {
      const dto = {
        enabled: true,
      };

      const result = await controller.toggleBiometric('user-1', dto);

      expect(mockSettingsService.toggleBiometric).toHaveBeenCalledWith('user-1', true);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });
});
