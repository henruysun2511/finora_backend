import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletsService } from '../wallets/wallets.service';
import { BudgetsService } from '../budgets/budgets.service';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { InsightGeneratorService } from './services/insight-generator.service';
import { AiInsightAdvisorService } from './services/ai-insight-advisor.service';
import { FinancialInsightsMapper } from './mapper/financial-insights.mapper';
import { SpendingPaceQueryDto } from './dto/request/spending-pace-query.dto';
import { SpendingPaceResponseDto } from './dto/response/spending-pace-response.dto';
import { TodaySpendingGuideResponseDto } from './dto/response/today-spending-guide-response.dto';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { PacingSeverity, PacingStatus } from './financial-insights.constant';
import { InsightInvalidDateException } from './exceptions/financial-insights.exception';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class FinancialInsightsService {
  private readonly logger = new Logger(FinancialInsightsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletsService: WalletsService,
    private readonly budgetsService: BudgetsService,
    private readonly transactionRepo: TransactionRepository,
    private readonly insightGenerator: InsightGeneratorService,
    private readonly aiAdvisor: AiInsightAdvisorService,
    private readonly mapper: FinancialInsightsMapper,
  ) {}

  /**
   * Lấy tiến độ chi tiêu thời gian thực & gợi ý chi tiêu mỗi ngày cho 1 ví cụ thể.
   */
  async getWalletSpendingPace(
    userId: string,
    walletId: string,
    query?: SpendingPaceQueryDto,
  ): Promise<SpendingPaceResponseDto> {
    await this.walletsService.assertWalletAccess(walletId, userId, 'read');
    const wallet = await this.walletsService.getWalletById(walletId, userId);

    const accounts = await this.walletsService.getWalletAccounts(walletId, userId);
    const accountIds = accounts.map((a) => a.id);

    return this.calculatePaceForAccounts({
      userId,
      walletId,
      walletName: wallet.name,
      currency: wallet.defaultCurrency || 'VND',
      accountIds,
      query,
    });
  }

  /**
   * Lấy tiến độ chi tiêu tổng hợp trên toàn bộ các ví của người dùng.
   */
  async getOverallSpendingPace(
    userId: string,
    query?: SpendingPaceQueryDto,
  ): Promise<SpendingPaceResponseDto> {
    const userWallets = await this.walletsService.getUserWallets(userId);
    if (!userWallets || userWallets.length === 0) {
      return this.mapper.toEmptyResponse(query?.date);
    }

    const allAccountIds: string[] = [];
    for (const w of userWallets) {
      const accounts = await this.walletsService.getWalletAccounts(w.id, userId);
      allAccountIds.push(...accounts.map((a) => a.id));
    }

    const primaryCurrency = userWallets[0]?.defaultCurrency || 'VND';

    return this.calculatePaceForAccounts({
      userId,
      walletId: null,
      walletName: 'Tất cả ví',
      currency: primaryCurrency,
      accountIds: allAccountIds,
      query,
    });
  }

  /**
   * API Thu gọn cho Widget Mobile: Hôm nay được tiêu bao nhiêu?
   */
  async getTodayGuide(
    userId: string,
    walletId?: string,
    query?: SpendingPaceQueryDto,
  ): Promise<TodaySpendingGuideResponseDto> {
    const pace = walletId
      ? await this.getWalletSpendingPace(userId, walletId, query)
      : await this.getOverallSpendingPace(userId, query);

    return this.mapper.toTodayGuideResponse({
      date: query?.date || new Date().toISOString().slice(0, 10),
      daysRemaining: pace.timeline.daysRemaining,
      safeToSpendToday: pace.dailyAllowance.recommendedDailyLimit,
      spentToday: pace.dailyAllowance.spentToday,
      remainingToday: pace.dailyAllowance.remainingToday,
      remainingMonthBudget: pace.budget.remainingAmount,
      currency: pace.currency,
      pacingStatus: pace.pacing.status,
      severity: pace.insight.severity,
      advice: pace.insight.advice,
      aiAdvice: pace.insight.aiAdvice,
      isAiGenerated: pace.insight.isAiGenerated,
    });
  }

  /**
   * Làm mới lời khuyên từ AI Advisor (bỏ qua cache)
   */
  async refreshAiAdvice(
    userId: string,
    walletId?: string,
  ): Promise<SpendingPaceResponseDto> {
    this.aiAdvisor.clearCache(userId, walletId);

    const query: SpendingPaceQueryDto = {
      useAi: true,
      refreshAi: true,
    };

    return walletId
      ? this.getWalletSpendingPace(userId, walletId, query)
      : this.getOverallSpendingPace(userId, query);
  }

  /**
   * Lõi tính toán tiến độ chi tiêu thời gian thực & kết hợp lời khuyên từ AI
   */
  private async calculatePaceForAccounts(params: {
    userId: string;
    walletId: string | null;
    walletName: string;
    currency: string;
    accountIds: string[];
    query?: SpendingPaceQueryDto;
  }): Promise<SpendingPaceResponseDto> {
    const { userId, walletId, walletName, currency, accountIds, query } = params;

    // 1. Phân tích dòng thời gian (Timeline)
    const targetDate = query?.date ? new Date(query.date) : new Date();
    if (isNaN(targetDate.getTime())) {
      throw new InsightInvalidDateException(query?.date);
    }

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const totalDays = endOfMonth.getDate();
    const daysPassed = targetDate.getDate();
    const daysRemaining = Math.max(1, totalDays - daysPassed + 1);
    const timeElapsedPercentage = round2((daysPassed / totalDays) * 100);

    // 2. Truy vấn số liệu chi tiêu thực tế
    const { totalSpentInMonth, spentToday } = await this.queryExpenses(
      accountIds,
      startOfMonth,
      endOfMonth,
      targetDate,
    );

    // 3. Truy vấn ngân sách tháng
    const { totalLimit: budgetLimit, hasBudget } = await this.queryBudgetLimit(
      userId,
      walletId,
    );

    let baselineBudget = budgetLimit;
    if (!hasBudget || baselineBudget <= 0) {
      const estimatedIncome = await this.queryIncomeAmount(
        accountIds,
        startOfMonth,
        endOfMonth,
      );
      baselineBudget =
        estimatedIncome > 0 ? Math.round(estimatedIncome * 0.8) : totalSpentInMonth * 1.2;
    }

    // 4. Tính toán số tiền còn lại và hạn mức chi tiêu mỗi ngày
    const remainingAmount = baselineBudget - totalSpentInMonth;
    const spentPercentage =
      baselineBudget > 0 ? round2((totalSpentInMonth / baselineBudget) * 100) : 0;

    const initialDailyBudget =
      baselineBudget > 0 ? Math.round(baselineBudget / totalDays) : 0;
    const actualDailySpentAvg =
      daysPassed > 0 ? Math.round(totalSpentInMonth / daysPassed) : 0;

    const rawRecommendedDaily =
      remainingAmount > 0 ? Math.floor(remainingAmount / daysRemaining) : 0;
    const recommendedDailyLimit = Math.max(0, rawRecommendedDaily);
    const remainingToday = recommendedDailyLimit - spentToday;

    // 5. Đánh giá tốc độ chi tiêu (Burn rate) & Dòng trạng thái (Pacing)
    const expectedSpentRatio = daysPassed / totalDays;
    const actualSpentRatio = baselineBudget > 0 ? totalSpentInMonth / baselineBudget : 0;
    const burnRateMultiplier =
      expectedSpentRatio > 0 ? round2(actualSpentRatio / expectedSpentRatio) : 1;

    const pacingStatus = this.insightGenerator.evaluatePacingStatus({
      hasBudget,
      remainingAmount,
      burnRateMultiplier,
    });

    const projectedMonthEndExpense = Math.round(actualDailySpentAvg * totalDays);
    const estimatedOverspendAmount = Math.max(
      0,
      projectedMonthEndExpense - baselineBudget,
    );

    // 6. Tạo lời khuyên tài chính theo quy tắc (Rule-based Fast Fallback)
    const ruleBasedInsight = this.insightGenerator.generateInsight({
      daysRemaining,
      remainingAmount,
      recommendedDailyLimit,
      spentToday,
      hasBudget,
      currency,
      pacingStatus,
      totalLimit: baselineBudget,
    });

    // 7. Tích hợp AI Advisor (Sinh tự động hoặc lấy từ Cache)
    let aiAdvice: string | null = null;
    let isAiGenerated = false;

    const shouldCallAi = query?.useAi !== false;
    if (shouldCallAi) {
      try {
        const aiResult = await this.aiAdvisor.generateAiAdvice(
          {
            userId,
            walletId,
            walletName,
            currency,
            date: targetDate.toISOString().slice(0, 10),
            totalDays,
            daysPassed,
            daysRemaining,
            formattedLimit: this.insightGenerator.formatCurrency(baselineBudget, currency),
            formattedSpent: this.insightGenerator.formatCurrency(totalSpentInMonth, currency),
            formattedRemaining: this.insightGenerator.formatCurrency(remainingAmount, currency),
            formattedDailyLimit: this.insightGenerator.formatCurrency(recommendedDailyLimit, currency),
            formattedSpentToday: this.insightGenerator.formatCurrency(spentToday, currency),
            spentPercentage,
            pacingStatus,
          },
          query?.refreshAi === true,
        );

        if (aiResult) {
          aiAdvice = aiResult;
          isAiGenerated = true;
        }
      } catch (err: any) {
        this.logger.warn(
          `AI Advisor gặp sự cố, sử dụng Rule-based insight thay thế: ${err.message}`,
        );
      }
    }

    // 8. Đóng gói kết quả qua Mapper
    const timeline = this.mapper.toTimeline({
      startDate: startOfMonth,
      endDate: endOfMonth,
      targetDate,
      totalDays,
      daysPassed,
      daysRemaining,
      timeElapsedPercentage,
    });

    const budget = this.mapper.toBudgetSummary({
      hasBudget,
      totalLimit: baselineBudget,
      totalSpent: totalSpentInMonth,
      remainingAmount,
      spentPercentage,
    });

    const dailyAllowance = this.mapper.toDailyAllowance({
      initialDailyBudget,
      actualDailySpentAvg,
      recommendedDailyLimit,
      spentToday,
      remainingToday,
    });

    const pacing = this.mapper.toPacingMetrics({
      status: pacingStatus,
      burnRateMultiplier,
      projectedMonthEndExpense,
      estimatedOverspendAmount,
    });

    const insight = this.mapper.toInsight({
      severity: ruleBasedInsight.severity,
      badge: ruleBasedInsight.badge,
      headline: ruleBasedInsight.headline,
      subheadline: ruleBasedInsight.subheadline,
      advice: ruleBasedInsight.advice,
      aiAdvice,
      isAiGenerated,
    });

    return this.mapper.toPaceResponse({
      walletId,
      walletName,
      currency,
      timeline,
      budget,
      dailyAllowance,
      pacing,
      insight,
    });
  }

  /**
   * Truy vấn tổng chi tiêu trong tháng và trong ngày của các tài khoản
   */
  private async queryExpenses(
    accountIds: string[],
    startOfMonth: Date,
    endOfMonth: Date,
    targetDate: Date,
  ): Promise<{ totalSpentInMonth: number; spentToday: number }> {
    if (!accountIds || accountIds.length === 0) {
      return { totalSpentInMonth: 0, spentToday: 0 };
    }

    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999,
    );

    const rawMonth = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .from('transactions', 't')
      .where('t.account_id IN (:...accountIds)', { accountIds })
      .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.transaction_date >= :start', { start: startOfMonth })
      .andWhere('t.transaction_date <= :end', { end: endOfMonth })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    const rawToday = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .from('transactions', 't')
      .where('t.account_id IN (:...accountIds)', { accountIds })
      .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.transaction_date >= :start', { start: startOfDay })
      .andWhere('t.transaction_date <= :end', { end: endOfDay })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    return {
      totalSpentInMonth: parseFloat(rawMonth?.total) || 0,
      spentToday: parseFloat(rawToday?.total) || 0,
    };
  }

  /**
   * Truy vấn tổng thu nhập trong tháng (làm fallback khi chưa cài ngân sách)
   */
  private async queryIncomeAmount(
    accountIds: string[],
    startOfMonth: Date,
    endOfMonth: Date,
  ): Promise<number> {
    if (!accountIds || accountIds.length === 0) return 0;

    const raw = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .from('transactions', 't')
      .where('t.account_id IN (:...accountIds)', { accountIds })
      .andWhere('t.type = :type', { type: TransactionType.INCOME })
      .andWhere('t.transaction_date >= :start', { start: startOfMonth })
      .andWhere('t.transaction_date <= :end', { end: endOfMonth })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    return parseFloat(raw?.total) || 0;
  }

  /**
   * Lấy tổng hạn mức ngân sách tháng đã cài đặt cho ví (hoặc toàn bộ ví)
   */
  private async queryBudgetLimit(
    userId: string,
    walletId: string | null,
  ): Promise<{ totalLimit: number; hasBudget: boolean }> {
    try {
      const qb = this.dataSource
        .createQueryBuilder()
        .select(
            'COALESCE(SUM(bp.limit_amount + bp.rollover_amount), 0)',
            'totalLimit',
        )
        .from('budget_periods', 'bp')
        .innerJoin('budgets', 'b', 'b.id = bp.budget_id')
        .where('CURRENT_DATE >= bp.start_date AND CURRENT_DATE <= bp.end_date')
        .andWhere('b.deleted_at IS NULL');

      if (walletId) {
        qb.andWhere('b.wallet_id = :walletId', { walletId });
      } else {
        const userWalletIds = await this.walletsService.getUserWalletIds(userId);
        if (userWalletIds.length === 0) {
          return { totalLimit: 0, hasBudget: false };
        }
        qb.andWhere('b.wallet_id IN (:...userWalletIds)', { userWalletIds });
      }

      const raw = await qb.getRawOne();
      const limit = parseFloat(raw?.totalLimit) || 0;
      return {
        totalLimit: limit,
        hasBudget: limit > 0,
      };
    } catch (err: any) {
      this.logger.warn(`Lỗi khi truy vấn ngân sách: ${err.message}`);
      return { totalLimit: 0, hasBudget: false };
    }
  }
}
