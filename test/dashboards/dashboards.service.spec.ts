import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../src/modules/dashboards/dashboards.service';
import { DashboardRepository } from '../../src/modules/dashboards/repositories/dashboards.repository';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { DashboardMapper } from '../../src/modules/dashboards/mapper/dashboards.mapper';
import { DashboardWalletAccessDeniedException } from '../../src/modules/dashboards/exceptions/dashboards.exception';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockDashboardRepo: any;
  let mockWalletsService: any;

  beforeEach(async () => {
    mockDashboardRepo = {
      calculateNetWorth: jest.fn().mockResolvedValue(158500000),
      getMonthlyCashflow: jest.fn().mockResolvedValue({ income: 35000000, expense: 18200000 }),
      getOverviewDetails: jest.fn().mockResolvedValue({
        accounts: [],
        recentTransactions: [],
        budgetAlerts: [],
        recurringAlerts: [],
      }),
    };

    mockWalletsService = {
      getUserWalletIds: jest.fn().mockResolvedValue(['wallet-1', 'wallet-2']),
      assertWalletAccess: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        DashboardMapper,
        { provide: DashboardRepository, useValue: mockDashboardRepo },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExecutiveOverview', () => {
    it('Happy path: trả về tổng quan tài chính thành công khi dữ liệu và quyền ví hợp lệ', async () => {
      const userId = 'user-1';
      const query = { walletId: 'wallet-1' };

      const result = await service.getExecutiveOverview(userId, query);

      expect(result).toBeDefined();
      expect(result.netWorth).toEqual(158500000);
      expect(result.monthlyCashflow.income).toEqual(35000000);
      expect(result.monthlyCashflow.expense).toEqual(18200000);
      expect(mockWalletsService.getUserWalletIds).toHaveBeenCalledWith(userId);
      expect(mockDashboardRepo.calculateNetWorth).toHaveBeenCalledWith(userId, query.walletId);
    });

    it('Edge case / Exception: ném DashboardWalletAccessDeniedException khi ví yêu cầu không thuộc quyền sở hữu của user', async () => {
      const userId = 'user-1';
      const query = { walletId: 'wallet-unauthorized-999' };

      await expect(service.getExecutiveOverview(userId, query)).rejects.toThrow(
        DashboardWalletAccessDeniedException,
      );
      expect(mockWalletsService.getUserWalletIds).toHaveBeenCalledWith(userId);
    });
  });

  describe('getSharedWalletDashboard', () => {
    it('calculates settlements across all members, including members who paid nothing', async () => {
      mockDashboardRepo.getSharedWallet = jest.fn().mockResolvedValue({
        id: 'wallet-1',
        name: 'Ví gia đình',
        currency: 'VND',
      });
      mockDashboardRepo.getSharedWalletContributions = jest.fn().mockResolvedValue([
        { userId: 'user-1', fullName: 'Minh', avatar: null, totalPaid: 900 },
        { userId: 'user-2', fullName: 'Mai', avatar: null, totalPaid: 300 },
      ]);
      mockDashboardRepo.getSharedWalletMembers = jest.fn().mockResolvedValue([
        { userId: 'user-1', fullName: 'Minh', avatar: null },
        { userId: 'user-2', fullName: 'Mai', avatar: null },
        { userId: 'user-3', fullName: 'An', avatar: null },
      ]);

      const result = await service.getSharedWalletDashboard('user-1', 'wallet-1');

      expect(result.memberContributions).toHaveLength(3);
      expect(result.settlementMatrix.isBalanced).toBe(false);
      expect(result.settlementMatrix.suggestedSettlements).toEqual([
        expect.objectContaining({ fromUserId: 'user-2', toUserId: 'user-1', amount: 100 }),
        expect.objectContaining({ fromUserId: 'user-3', toUserId: 'user-1', amount: 400 }),
      ]);
    });
  });
});