import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../src/modules/dashboards/dashboards.service';
import { DashboardRepository } from '../../src/modules/dashboards/repositories/dashboards.repository';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { DashboardWalletAccessDeniedException } from '../../src/modules/dashboards/exceptions/dashboards.exception';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockDashboardRepo: any;
  let mockWalletsService: any;

  beforeEach(async () => {
    mockDashboardRepo = {
      calculateNetWorth: jest.fn().mockResolvedValue(158500000),
      getMonthlyCashflow: jest.fn().mockResolvedValue({ income: 35000000, expense: 18200000 }),
    };

    mockWalletsService = {
      getUserWalletIds: jest.fn().mockResolvedValue(['wallet-1', 'wallet-2']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
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
});