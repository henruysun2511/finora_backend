import { Test, TestingModule } from '@nestjs/testing';
import { MascotsService } from 'modules/mascots/mascots.service';
import { MascotRepository } from 'modules/mascots/repositories/mascot.repository';
import { MascotMapper } from 'modules/mascots/mapper/mascot.mapper';
import { NotificationsService } from 'modules/notifications/notifications.service';
import { NotificationType } from 'modules/notifications/enums/notification-type.enum';
import { AssetTier } from 'modules/mascots/entities/asset-tier.entity';
import {
  MascotNotFoundException,
  MascotTierNameAlreadyExistsException,
  MascotInvalidNetWorthRangeException,
  MascotCannotDeleteException,
} from 'modules/mascots/exceptions/mascot.exception';

describe('MascotsService', () => {
  let service: MascotsService;

  const mockTiers: AssetTier[] = [
    {
      id: 'tier-1',
      tierName: 'ash',
      displayName: 'Kẻ Sinh Tồn',
      minNetWorth: -999999999999,
      maxNetWorth: 0,
      displayOrder: 1,
      quotes: ['Tiết kiệm đi!'],
      systemPrompt: 'Bạn là Ash...',
      htmlContent: '<div data-mascot="ash"></div>',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AssetTier,
    {
      id: 'tier-2',
      tierName: 'nora',
      displayName: 'Huấn Luyện Viên Đời Sống',
      minNetWorth: 5000000,
      maxNetWorth: 20000000,
      displayOrder: 4,
      quotes: ['Khoản chi hợp lý!'],
      systemPrompt: 'Bạn là Nora...',
      htmlContent: '<div data-mascot="nora"></div>',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AssetTier,
  ];

  const mockMascotRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(async (tier) => ({
      id: tier.id || 'tier-new',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...tier,
    })),
    findById: jest.fn(),
    findByTierName: jest.fn(),
    findAll: jest.fn().mockResolvedValue(mockTiers),
    findTierByNetWorth: jest.fn(),
    count: jest.fn().mockResolvedValue(2),
    softDelete: jest.fn().mockResolvedValue(undefined),
    getUserTotalWalletBalance: jest.fn(),
    getUserTotalBorrowedDebt: jest.fn(),
    getUserShowMascotPreference: jest.fn(),
    getUserCurrentMascotTierId: jest.fn(),
    updateUserCurrentMascotTierId: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotsService,
        MascotMapper,
        {
          provide: MascotRepository,
          useValue: mockMascotRepo,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<MascotsService>(MascotsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new mascot successfully', async () => {
      mockMascotRepo.findByTierName.mockResolvedValue(null);

      const result = await service.create({
        tierName: 'phoenix',
        displayName: 'Phượng Hoàng',
        minNetWorth: 10000000,
        maxNetWorth: 50000000,
        displayOrder: 5,
        htmlContent: '<div>Phoenix</div>',
        systemPrompt: 'Prompt...',
        quotes: ['Bay cao!'],
      });

      expect(mockMascotRepo.findByTierName).toHaveBeenCalledWith('phoenix');
      expect(result.tierName).toBe('phoenix');
      expect(result.displayName).toBe('Phượng Hoàng');
    });

    it('should throw MascotTierNameAlreadyExistsException if tierName exists', async () => {
      mockMascotRepo.findByTierName.mockResolvedValue(mockTiers[0]);

      await expect(
        service.create({
          tierName: 'ash',
          displayName: 'Kẻ Sinh Tồn',
          minNetWorth: 0,
          displayOrder: 1,
          htmlContent: '<div></div>',
          systemPrompt: '...',
        }),
      ).rejects.toThrow(MascotTierNameAlreadyExistsException);
    });

    it('should throw MascotInvalidNetWorthRangeException if minNetWorth >= maxNetWorth', async () => {
      mockMascotRepo.findByTierName.mockResolvedValue(null);

      await expect(
        service.create({
          tierName: 'test',
          displayName: 'Test',
          minNetWorth: 1000,
          maxNetWorth: 500,
          displayOrder: 1,
          htmlContent: '<div></div>',
          systemPrompt: '...',
        }),
      ).rejects.toThrow(MascotInvalidNetWorthRangeException);
    });
  });

  describe('findAll', () => {
    it('should return all mascot tiers', async () => {
      mockMascotRepo.findAll.mockResolvedValue(mockTiers);

      const result = await service.findAll();

      expect(mockMascotRepo.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].tierName).toBe('ash');
    });
  });

  describe('findOne', () => {
    it('should return mascot by id', async () => {
      mockMascotRepo.findById.mockResolvedValue(mockTiers[1]);

      const result = await service.findOne('tier-2');

      expect(result.tierName).toBe('nora');
    });

    it('should throw MascotNotFoundException if not found', async () => {
      mockMascotRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        MascotNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update mascot fields successfully', async () => {
      mockMascotRepo.findById.mockResolvedValue({ ...mockTiers[1] });
      mockMascotRepo.findByTierName.mockResolvedValue(null);

      const result = await service.update('tier-2', {
        displayName: 'Nora HLV Đời Sống Pro',
        minNetWorth: 6000000,
      });

      expect(result.displayName).toBe('Nora HLV Đời Sống Pro');
      expect(result.minNetWorth).toBe(6000000);
    });

    it('should throw MascotTierNameAlreadyExistsException when updating to an existing tierName', async () => {
      mockMascotRepo.findById.mockResolvedValue({ ...mockTiers[1] });
      mockMascotRepo.findByTierName.mockResolvedValue(mockTiers[0]);

      await expect(
        service.update('tier-2', {
          tierName: 'ash',
        }),
      ).rejects.toThrow(MascotTierNameAlreadyExistsException);
    });
  });

  describe('remove', () => {
    it('should soft delete mascot when conditions are met', async () => {
      mockMascotRepo.findById.mockResolvedValue(mockTiers[0]);
      mockMascotRepo.count.mockResolvedValue(5);

      await service.remove('tier-1');

      expect(mockMascotRepo.softDelete).toHaveBeenCalledWith('tier-1');
    });

    it('should throw MascotCannotDeleteException if only 1 mascot remains in system', async () => {
      mockMascotRepo.findById.mockResolvedValue(mockTiers[0]);
      mockMascotRepo.count.mockResolvedValue(1);

      await expect(service.remove('tier-1')).rejects.toThrow(
        MascotCannotDeleteException,
      );
    });
  });

  describe('getCurrentUserMascot', () => {
    it('should calculate net worth from repository methods and return matching mascot', async () => {
      mockMascotRepo.getUserTotalWalletBalance.mockResolvedValue(10000000);
      mockMascotRepo.getUserTotalBorrowedDebt.mockResolvedValue(2000000);
      mockMascotRepo.getUserShowMascotPreference.mockResolvedValue(true);
      mockMascotRepo.findTierByNetWorth.mockResolvedValue(mockTiers[1]);

      const result = await service.getCurrentUserMascot('user-id');

      expect(mockMascotRepo.getUserTotalWalletBalance).toHaveBeenCalledWith(
        'user-id',
      );
      expect(mockMascotRepo.getUserTotalBorrowedDebt).toHaveBeenCalledWith(
        'user-id',
      );
      expect(mockMascotRepo.getUserShowMascotPreference).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result.totalWalletBalance).toBe(10000000);
      expect(result.totalDebt).toBe(2000000);
      expect(result.netWorth).toBe(8000000);
      expect(result.showMascot).toBe(true);
      expect(result.mascot.tierName).toBe('nora');
      expect(result.greeting).toBe('Khoản chi hợp lý!');
    });
  });

  describe('checkMascotEvolution', () => {
    it('should initialize current tier on first check when no lastTierId exists', async () => {
      jest.spyOn(service, 'getCurrentUserMascot').mockResolvedValue({
        netWorth: 8000000,
        totalWalletBalance: 10000000,
        totalDebt: 2000000,
        showMascot: true,
        greeting: 'Hello',
        mascot: {
          id: 'tier-2',
          tierName: 'nora',
          displayName: 'Huấn Luyện Viên Đời Sống',
          minNetWorth: 5000000,
          displayOrder: 4,
          quotes: ['...'],
          systemPrompt: 'Prompt',
          htmlContent: '<div></div>',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockMascotRepo.getUserCurrentMascotTierId.mockResolvedValue(null);

      const result = await service.checkMascotEvolution('user-id');

      expect(result.evolved).toBe(false);
      expect(mockMascotRepo.updateUserCurrentMascotTierId).toHaveBeenCalledWith(
        'user-id',
        'tier-2',
      );
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should return evolved: false when current tier matches lastTierId', async () => {
      jest.spyOn(service, 'getCurrentUserMascot').mockResolvedValue({
        netWorth: 8000000,
        totalWalletBalance: 10000000,
        totalDebt: 2000000,
        showMascot: true,
        greeting: 'Hello',
        mascot: {
          id: 'tier-2',
          tierName: 'nora',
          displayName: 'Huấn Luyện Viên Đời Sống',
          minNetWorth: 5000000,
          displayOrder: 4,
          quotes: ['...'],
          systemPrompt: 'Prompt',
          htmlContent: '<div></div>',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockMascotRepo.getUserCurrentMascotTierId.mockResolvedValue('tier-2');

      const result = await service.checkMascotEvolution('user-id');

      expect(result.evolved).toBe(false);
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should trigger Level Up notification when transitioning to higher tier', async () => {
      // Transition from tier-1 (Ash, order 1) to tier-2 (Nora, order 4)
      jest.spyOn(service, 'getCurrentUserMascot').mockResolvedValue({
        netWorth: 8000000,
        totalWalletBalance: 10000000,
        totalDebt: 2000000,
        showMascot: true,
        greeting: 'Hello',
        mascot: {
          id: 'tier-2',
          tierName: 'nora',
          displayName: 'Huấn Luyện Viên Đời Sống',
          minNetWorth: 5000000,
          displayOrder: 4,
          quotes: ['...'],
          systemPrompt: 'Prompt',
          htmlContent: '<div></div>',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockMascotRepo.getUserCurrentMascotTierId.mockResolvedValue('tier-1');
      mockMascotRepo.findById.mockResolvedValue(mockTiers[0]); // Ash

      const result = await service.checkMascotEvolution('user-id');

      expect(result.evolved).toBe(true);
      expect(result.isLevelUp).toBe(true);
      expect(result.currentMascot.tierName).toBe('nora');
      expect(result.previousMascot?.tierName).toBe('ash');
      expect(mockMascotRepo.updateUserCurrentMascotTierId).toHaveBeenCalledWith(
        'user-id',
        'tier-2',
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          type: NotificationType.ASSET_TIER_UP,
          relatedEntityType: 'MASCOT_TIER',
          relatedEntityId: 'tier-2',
        }),
      );
    });
  });

  describe('getSystemPromptForUser', () => {
    it('should return system prompt for user active mascot', async () => {
      jest.spyOn(service, 'getCurrentUserMascot').mockResolvedValue({
        netWorth: 8000000,
        totalWalletBalance: 10000000,
        totalDebt: 2000000,
        showMascot: true,
        greeting: 'Hello',
        mascot: {
          id: 'tier-2',
          tierName: 'nora',
          displayName: 'Huấn Luyện Viên Đời Sống',
          minNetWorth: 5000000,
          displayOrder: 4,
          quotes: ['...'],
          systemPrompt: 'Prompt for Nora',
          htmlContent: '<div></div>',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const prompt = await service.getSystemPromptForUser('user-id');

      expect(prompt).toBe('Prompt for Nora');
    });
  });
});
