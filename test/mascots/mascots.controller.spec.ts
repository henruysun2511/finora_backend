import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { MascotsController } from 'modules/mascots/mascots.controller';
import { MascotsService } from 'modules/mascots/mascots.service';
import { MascotTierResponseDto } from 'modules/mascots/dto/response/mascot-tier-response.dto';
import { CurrentMascotResponseDto } from 'modules/mascots/dto/response/current-mascot-response.dto';
import { MascotTone } from 'modules/mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from 'modules/mascots/enums/mascot-sensitivity.enum';

describe('MascotsController', () => {
  let controller: MascotsController;

  const mockMascotTier: MascotTierResponseDto = {
    id: 'tier-1',
    tierName: 'nora',
    displayName: 'Huấn Luyện Viên Đời Sống',
    minNetWorth: 5000000,
    maxNetWorth: 20000000,
    displayOrder: 4,
    quotes: ['Hello!'],
    systemPrompt: 'System prompt',
    htmlContent: '<div>Nora</div>',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCurrentMascot: CurrentMascotResponseDto = {
    netWorth: 10000000,
    totalWalletBalance: 12000000,
    totalDebt: 2000000,
    showMascot: true,
    mascotTone: MascotTone.BALANCED,
    mascotSensitivity: MascotSensitivity.ANOMALIES_ONLY,
    greeting: 'Hello!',
    mascot: mockMascotTier,
  };

  const mockMascotsService = {
    findAll: jest.fn().mockResolvedValue([mockMascotTier]),
    findOne: jest.fn().mockResolvedValue(mockMascotTier),
    create: jest.fn().mockResolvedValue(mockMascotTier),
    update: jest.fn().mockResolvedValue(mockMascotTier),
    remove: jest.fn().mockResolvedValue(undefined),
    getCurrentUserMascot: jest.fn().mockResolvedValue(mockCurrentMascot),
    checkMascotEvolution: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MascotsController],
      providers: [
        {
          provide: MascotsService,
          useValue: mockMascotsService,
        },
      ],
    }).compile();

    controller = module.get<MascotsController>(MascotsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllMascots', () => {
    it('should return all mascots wrapped in ApiResponse', async () => {
      const response = await controller.getAllMascots();

      expect(mockMascotsService.findAll).toHaveBeenCalled();
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.data).toEqual([mockMascotTier]);
    });
  });

  describe('getCurrentMascot', () => {
    it('should return current user mascot wrapped in ApiResponse', async () => {
      const response = await controller.getCurrentMascot('user-id');

      expect(mockMascotsService.getCurrentUserMascot).toHaveBeenCalledWith(
        'user-id',
      );
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.data).toEqual(mockCurrentMascot);
    });
  });

  describe('syncMascotEvolution', () => {
    it('should sync evolution and return ApiResponse', async () => {
      mockMascotsService.checkMascotEvolution = jest.fn().mockResolvedValue({
        evolved: true,
        isLevelUp: true,
        netWorth: 10000000,
        currentMascot: mockMascotTier,
        message: 'Thăng hạng thành công!',
      });

      const response = await controller.syncMascotEvolution('user-id');

      expect(mockMascotsService.checkMascotEvolution).toHaveBeenCalledWith(
        'user-id',
      );
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.data.evolved).toBe(true);
    });
  });

  describe('getMascotById', () => {
    it('should return mascot by id wrapped in ApiResponse', async () => {
      const response = await controller.getMascotById('tier-1');

      expect(mockMascotsService.findOne).toHaveBeenCalledWith('tier-1');
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.data).toEqual(mockMascotTier);
    });
  });

  describe('createMascot', () => {
    it('should create mascot and return 201 Created', async () => {
      const dto = {
        tierName: 'nora',
        displayName: 'Nora',
        minNetWorth: 5000000,
        displayOrder: 4,
        htmlContent: '<div></div>',
        systemPrompt: 'Prompt',
      };
      const response = await controller.createMascot(dto);

      expect(mockMascotsService.create).toHaveBeenCalledWith(dto);
      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.data).toEqual(mockMascotTier);
    });
  });

  describe('updateMascot', () => {
    it('should update mascot and return 200 OK', async () => {
      const dto = { displayName: 'Nora Updated' };
      const response = await controller.updateMascot('tier-1', dto);

      expect(mockMascotsService.update).toHaveBeenCalledWith('tier-1', dto);
      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.data).toEqual(mockMascotTier);
    });
  });

  describe('deleteMascot', () => {
    it('should soft delete mascot', async () => {
      await controller.deleteMascot('tier-1');

      expect(mockMascotsService.remove).toHaveBeenCalledWith('tier-1');
    });
  });
});
