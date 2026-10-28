import { FinancialInsightsService } from '../../src/modules/financial-insights/financial-insights.service';
import { FinancialInsightsMapper } from '../../src/modules/financial-insights/mapper/financial-insights.mapper';
import { InsightGeneratorService } from '../../src/modules/financial-insights/services/insight-generator.service';
import { AiInsightAdvisorService } from '../../src/modules/financial-insights/services/ai-insight-advisor.service';
import { PacingSeverity, PacingStatus } from '../../src/modules/financial-insights/financial-insights.constant';

describe('FinancialInsightsService', () => {
  let service: FinancialInsightsService;
  let dataSource: any;
  let walletsService: any;
  let budgetsService: any;
  let transactionRepo: any;
  let insightGenerator: InsightGeneratorService;
  let aiAdvisor: any;
  let mapper: FinancialInsightsMapper;

  const USER_ID = 'u-test-123';
  const WALLET_ID = 'w-test-456';

  beforeEach(() => {
    insightGenerator = new InsightGeneratorService();
    mapper = new FinancialInsightsMapper();

    aiAdvisor = {
      generateAiAdvice: jest.fn().mockResolvedValue(null),
      clearCache: jest.fn(),
    };

    walletsService = {
      assertWalletAccess: jest.fn().mockResolvedValue(undefined),
      getWalletById: jest.fn().mockResolvedValue({
        id: WALLET_ID,
        name: 'Ví Chi tiêu Cá nhân',
        defaultCurrency: 'VND',
      }),
      getWalletAccounts: jest.fn().mockResolvedValue([
        { id: 'acc-1', walletId: WALLET_ID, name: 'Tiền mặt', balance: 5000000 },
        { id: 'acc-2', walletId: WALLET_ID, name: 'Vietcombank', balance: 10000000 },
      ]),
      getUserWallets: jest.fn().mockResolvedValue([
        { id: WALLET_ID, name: 'Ví Chi tiêu Cá nhân', defaultCurrency: 'VND' },
      ]),
      getUserWalletIds: jest.fn().mockResolvedValue([WALLET_ID]),
    };

    budgetsService = {};
    transactionRepo = {};

    dataSource = {
      createQueryBuilder: jest.fn(),
    };

    service = new FinancialInsightsService(
      dataSource,
      walletsService,
      budgetsService,
      transactionRepo,
      insightGenerator,
      aiAdvisor,
      mapper,
    );
  });

  describe('getWalletSpendingPace', () => {
    it('kịch bản 1: Tiêu nhanh hơn dự kiến (Overpacing - còn 1.300.000₫ và 13 ngày -> gợi ý 100.000₫/ngày)', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '8700000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '45000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      const res = await service.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
        useAi: false,
      });

      expect(res.walletId).toBe(WALLET_ID);
      expect(res.budget.totalLimit).toBe(10000000);
      expect(res.budget.totalSpent).toBe(8700000);
      expect(res.budget.remainingAmount).toBe(1300000);
      expect(res.timeline.daysRemaining).toBe(13);

      expect(res.dailyAllowance.recommendedDailyLimit).toBe(100000);
      expect(res.dailyAllowance.spentToday).toBe(45000);
      expect(res.dailyAllowance.remainingToday).toBe(55000);

      expect(res.pacing.status).toBe(PacingStatus.OVERPACING);
      expect(res.insight.severity).toBe(PacingSeverity.WARNING);
      expect(res.insight.headline).toContain('13 ngày');
      expect(res.insight.subheadline).toContain('1.300.000₫');
      expect(res.insight.advice).toContain('100.000₫');
    });

    it('kịch bản AI Advisor cá nhân hóa lời khuyên thành công', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '8700000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '45000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      aiAdvisor.generateAiAdvice.mockResolvedValue(
        'Cuối tuần này thử chọn quán bình dân để không cháy túi nhé!',
      );

      const res = await service.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
        useAi: true,
      });

      expect(aiAdvisor.generateAiAdvice).toHaveBeenCalled();
      expect(res.insight.isAiGenerated).toBe(true);
      expect(res.insight.aiAdvice).toBe(
        'Cuối tuần này thử chọn quán bình dân để không cháy túi nhé!',
      );
    });

    it('kịch bản 2: Vỡ ngân sách (EXCEEDED - đã tiêu vượt ngân sách)', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '10500000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '150000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      const res = await service.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
        useAi: false,
      });

      expect(res.budget.remainingAmount).toBe(-500000);
      expect(res.dailyAllowance.recommendedDailyLimit).toBe(0);
      expect(res.pacing.status).toBe(PacingStatus.EXCEEDED);
      expect(res.insight.severity).toBe(PacingSeverity.DANGER);
      expect(res.insight.subheadline).toContain('500.000₫');
      expect(res.insight.badge).toContain('Thâm hụt ngân sách');
    });

    it('kịch bản 3: Chi tiêu kỷ luật (EXCELLENT)', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '2000000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '50000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      const res = await service.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
        useAi: false,
      });

      expect(res.pacing.status).toBe(PacingStatus.EXCELLENT);
      expect(res.insight.severity).toBe(PacingSeverity.SUCCESS);
      expect(res.insight.badge).toContain('kỷ luật');
    });

    it('kịch bản 4: Chưa cài đặt ngân sách -> Sử dụng 80% thu nhập làm hạn mức gợi ý', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '3000000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '50000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '0' });
        } else if (queryCallCount === 4) {
          qb.getRawOne.mockResolvedValue({ total: '20000000' });
        }
        return qb;
      });

      const res = await service.getWalletSpendingPace(USER_ID, WALLET_ID, {
        date: '2026-10-19',
        useAi: false,
      });

      expect(res.budget.hasBudget).toBe(false);
      expect(res.budget.totalLimit).toBe(16000000);
      expect(res.insight.badge).toContain('Chưa đặt ngân sách');
    });
  });

  describe('getOverallSpendingPace', () => {
    it('tổng hợp thành công chi tiêu trên toàn bộ ví của người dùng', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '5000000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '100000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '15000000' });
        }
        return qb;
      });

      const res = await service.getOverallSpendingPace(USER_ID, {
        date: '2026-10-19',
        useAi: false,
      });

      expect(res.walletId).toBeNull();
      expect(res.walletName).toBe('Tất cả ví');
      expect(res.budget.totalLimit).toBe(15000000);
      expect(res.budget.totalSpent).toBe(5000000);
    });

    it('trả về empty response nếu người dùng chưa có ví nào', async () => {
      walletsService.getUserWallets.mockResolvedValue([]);

      const res = await service.getOverallSpendingPace(USER_ID);
      expect(res.walletName).toBe('Chưa có ví');
      expect(res.budget.totalLimit).toBe(0);
    });
  });

  describe('getTodayGuide', () => {
    it('trả về DTO rút gọn cho Home Widget', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '8700000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '45000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      const res = await service.getTodayGuide(USER_ID, WALLET_ID);
      expect(res.safeToSpendToday).toBeDefined();
      expect(res.spentToday).toBe(45000);
      expect(res.remainingToday).toBeDefined();
      expect(res.remainingMonthBudget).toBe(1300000);
      expect(res.advice).toBeDefined();
    });
  });

  describe('refreshAiAdvice', () => {
    it('xóa cache và làm mới lời khuyên', async () => {
      let queryCallCount = 0;
      dataSource.createQueryBuilder.mockImplementation(() => {
        queryCallCount++;
        const qb: any = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(),
        };

        if (queryCallCount === 1) {
          qb.getRawOne.mockResolvedValue({ total: '8700000' });
        } else if (queryCallCount === 2) {
          qb.getRawOne.mockResolvedValue({ total: '45000' });
        } else if (queryCallCount === 3) {
          qb.getRawOne.mockResolvedValue({ totalLimit: '10000000' });
        }
        return qb;
      });

      aiAdvisor.generateAiAdvice.mockResolvedValue('Lời khuyên mới từ AI!');

      const res = await service.refreshAiAdvice(USER_ID, WALLET_ID);
      expect(aiAdvisor.clearCache).toHaveBeenCalledWith(USER_ID, WALLET_ID);
      expect(res.insight.aiAdvice).toBe('Lời khuyên mới từ AI!');
      expect(res.insight.isAiGenerated).toBe(true);
    });
  });
});
