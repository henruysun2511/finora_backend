import { FinancialInsightsController } from '../../src/modules/financial-insights/financial-insights.controller';
import { FinancialInsightsService } from '../../src/modules/financial-insights/financial-insights.service';
import { PacingSeverity, PacingStatus } from '../../src/modules/financial-insights/financial-insights.constant';

describe('FinancialInsightsController', () => {
  let controller: FinancialInsightsController;
  let service: jest.Mocked<FinancialInsightsService>;

  const USER_ID = 'u-test-123';
  const WALLET_ID = 'w-test-456';

  const mockSpendingPaceResponse = {
    walletId: WALLET_ID,
    walletName: 'Ví Cá Nhân',
    currency: 'VND',
    timeline: {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      totalDays: 31,
      daysPassed: 18,
      daysRemaining: 13,
      timeElapsedPercentage: 58.06,
    },
    budget: {
      hasBudget: true,
      totalLimit: 10000000,
      totalSpent: 8700000,
      remainingAmount: 1300000,
      spentPercentage: 87.0,
    },
    dailyAllowance: {
      initialDailyBudget: 322580,
      actualDailySpentAvg: 483333,
      recommendedDailyLimit: 100000,
      spentToday: 45000,
      remainingToday: 55000,
    },
    pacing: {
      status: PacingStatus.OVERPACING,
      burnRateMultiplier: 1.5,
      projectedMonthEndExpense: 14983323,
      estimatedOverspendAmount: 4983323,
    },
    insight: {
      severity: PacingSeverity.WARNING,
      badge: 'Tiêu nhanh hơn dự kiến ⚠️',
      headline: 'Bạn còn 13 ngày nữa là hết tháng.',
      subheadline: 'Số tiền còn lại được tiêu: 1.300.000₫.',
      advice: 'Từ nay đến cuối tháng, mỗi ngày bạn chỉ nên tiêu tối đa 100.000₫ để không bị thâm hụt ngân sách!',
      aiAdvice: 'Bạn đang chi tiêu vượt 50% dự kiến. Hãy cắt giảm ăn ngoài trong 13 ngày tới.',
      isAiGenerated: true,
    },
  };

  const mockTodayGuideResponse = {
    date: '2026-10-28',
    daysRemaining: 13,
    safeToSpendToday: 100000,
    spentToday: 45000,
    remainingToday: 55000,
    remainingMonthBudget: 1300000,
    currency: 'VND',
    pacingStatus: PacingStatus.OVERPACING,
    severity: PacingSeverity.WARNING,
    advice: 'Từ nay đến cuối tháng, mỗi ngày bạn chỉ nên tiêu tối đa 100.000₫ để không bị thâm hụt ngân sách!',
    aiAdvice: 'Hôm nay hãy tiết chế chi tiêu dưới 100.000₫ nhé!',
    isAiGenerated: true,
  };

  beforeEach(() => {
    service = {
      getWalletSpendingPace: jest.fn().mockResolvedValue(mockSpendingPaceResponse),
      getOverallSpendingPace: jest.fn().mockResolvedValue(mockSpendingPaceResponse),
      getTodayGuide: jest.fn().mockResolvedValue(mockTodayGuideResponse),
      refreshAiAdvice: jest.fn().mockResolvedValue(mockSpendingPaceResponse),
    } as any;

    controller = new FinancialInsightsController(service);
  });

  describe('getWalletSpendingPace', () => {
    it('gọi service và trả về ApiResponse.success cho 1 ví cụ thể', async () => {
      const result = await controller.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
      });

      expect(service.getWalletSpendingPace).toHaveBeenCalledWith(
        USER_ID,
        WALLET_ID,
        { date: '2026-10-19' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSpendingPaceResponse);
      expect(result.message).toContain('thành công');
    });
  });

  describe('getOverallSpendingPace', () => {
    it('gọi service và trả về ApiResponse.success tổng hợp toàn bộ ví', async () => {
      const result = await controller.getOverallSpendingPace(USER_ID, {
        date: '2026-10-19',
      });

      expect(service.getOverallSpendingPace).toHaveBeenCalledWith(USER_ID, {
        date: '2026-10-19',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSpendingPaceResponse);
    });
  });

  describe('getTodayGuide', () => {
    it('gọi service và trả về widget data hôm nay', async () => {
      const result = await controller.getTodayGuide(USER_ID, WALLET_ID);

      expect(service.getTodayGuide).toHaveBeenCalledWith(USER_ID, WALLET_ID);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTodayGuideResponse);
    });
  });

  describe('refreshWalletAiAdvice', () => {
    it('gọi refreshAiAdvice cho ví cụ thể và trả về ApiResponse.success', async () => {
      const result = await controller.refreshWalletAiAdvice(USER_ID, WALLET_ID);

      expect(service.refreshAiAdvice).toHaveBeenCalledWith(USER_ID, WALLET_ID);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSpendingPaceResponse);
      expect(result.message).toContain('thành công');
    });
  });

  describe('refreshOverallAiAdvice', () => {
    it('gọi refreshAiAdvice cho toàn bộ ví và trả về ApiResponse.success', async () => {
      const result = await controller.refreshOverallAiAdvice(USER_ID);

      expect(service.refreshAiAdvice).toHaveBeenCalledWith(USER_ID);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSpendingPaceResponse);
      expect(result.message).toContain('thành công');
    });
  });
});
