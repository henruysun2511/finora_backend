// src/modules/ai-chat/services/canned-query.registry.ts
import { Injectable, Logger } from '@nestjs/common';
import { AccountsService } from '../../accounts/accounts.service';
import { DashboardService } from '../../dashboards/dashboards.service';
import { CashFlowPeriod, CategoryBreakdownType } from '../../dashboards/dashboards.constant';
import { AI_CHAT_CONFIG } from '../constants';
import { ChatMessageType } from '../enums/chat-message-type.enum';
import { MascotCode } from '../interfaces/ai-chat.types';
import { resolveRange, TimeRange } from '../utils/date.util';
import { formatMoney, normalizeForMatch } from '../utils/text.util';
import { ChartBuilderService } from './chart-builder.service';
import { MascotToneService } from './mascot-tone.service';
import { CannedQueryFunction, CannedQueryPlan } from './query-planner.service';

export { CannedQueryFunction } from './query-planner.service';

export interface CannedQueryDefinition {
  name: CannedQueryFunction;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ExecuteCannedQueryResult {
  messageType: ChatMessageType;
  textContent: string;
  payloadJson: Record<string, any>;
}

export interface SpendingCategorySummary {
  id: string;
  name: string;
  amount: number;
  count: number;
}

export interface SpendingSummaryRangeResult {
  transactionCount: number;
  totalExpense: number;
  totalIncome: number;
  byCategory: Array<{ label: string; value: number }>;
  categories: SpendingCategorySummary[];
}

const TIME_RANGE_PARAM = {
  type: 'string',
  enum: Object.values(TimeRange),
  description: 'Khoảng thời gian (mặc định THIS_MONTH)',
};

/**
 * Registry các hàm truy vấn định sẵn (canned queries) được phê duyệt — "function calling" an toàn:
 * Sử dụng DashboardService để tổng hợp số liệu trực tiếp từ cơ sở dữ liệu qua SQL tối ưu,
 * đảm bảo dữ liệu đồng nhất 100% với Dashboard chính của ứng dụng.
 */
@Injectable()
export class CannedQueryRegistry {
  private readonly logger = new Logger(CannedQueryRegistry.name);

  private readonly definitions: CannedQueryDefinition[] = [
    {
      name: CannedQueryFunction.GET_SPENDING_SUMMARY,
      description:
        'Tổng chi/thu và cơ cấu chi theo danh mục (biểu đồ tròn) trong một khoảng thời gian; có thể lọc 1 danh mục.',
      parameters: {
        timeRange: TIME_RANGE_PARAM,
        categoryName: { type: 'string' },
      },
    },
    {
      name: CannedQueryFunction.GET_TOP_CATEGORIES,
      description:
        'Top danh mục chi nhiều nhất trong một khoảng thời gian (biểu đồ cột).',
      parameters: {
        timeRange: TIME_RANGE_PARAM,
        limit: { type: 'number', maximum: 10 },
      },
    },
    {
      name: CannedQueryFunction.GET_WALLET_BALANCES,
      description: 'Số dư từng tài khoản và tổng số dư của ví (stat card).',
      parameters: {},
    },
    {
      name: CannedQueryFunction.COMPARE_PERIODS,
      description:
        'So sánh tổng chi của kỳ hiện tại với kỳ liền trước (vd tháng này vs tháng trước).',
      parameters: { timeRange: TIME_RANGE_PARAM },
    },
    {
      name: CannedQueryFunction.GET_RECENT_TRANSACTIONS,
      description: 'Danh sách các giao dịch gần đây nhất.',
      parameters: { limit: { type: 'number', maximum: 20 } },
    },
    {
      name: CannedQueryFunction.GET_BUDGET_HEALTH,
      description:
        'Tiến độ ngân sách tháng, tốc độ chi tiêu hàng ngày và dự báo ngày hết tiền.',
      parameters: {},
    },
    {
      name: CannedQueryFunction.GET_RULE_50_30_20,
      description:
        'Phân tích chi tiêu theo quy tắc tài chính 50/30/20 (Thiết yếu / Hưởng thụ / Tích lũy).',
      parameters: {},
    },
    {
      name: CannedQueryFunction.GET_SPENDING_HABITS,
      description:
        'Thói quen chi tiêu theo các ngày trong tuần (heatmap) và theo 4 khung giờ trong ngày.',
      parameters: {},
    },
    {
      name: CannedQueryFunction.GET_DEBT_SUMMARY,
      description:
        'Tổng hợp sổ nợ: các khoản cho vay cần thu hồi và các khoản đi vay cần trả.',
      parameters: {},
    },
    {
      name: CannedQueryFunction.GET_CASHFLOW_SAVINGS,
      description:
        'Tổng quan dòng tiền hàng tháng và tỷ lệ tiết kiệm (Savings Rate).',
      parameters: {},
    },
  ];

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly accountsService: AccountsService,
    private readonly chartBuilder: ChartBuilderService,
    private readonly tone: MascotToneService,
  ) {}

  getDefinitions(): CannedQueryDefinition[] {
    return this.definitions;
  }

  isSupported(fn: string | null | undefined): boolean {
    return !!fn && this.definitions.some((d) => d.name === fn);
  }

  async execute(params: {
    plan: CannedQueryPlan;
    userId: string;
    walletId: string;
    mascot: MascotCode;
    userText?: string;
    systemPrompt?: string;
  }): Promise<ExecuteCannedQueryResult> {
    const { plan, userId, walletId, mascot, userText, systemPrompt } = params;
    switch (plan.functionName) {
      case CannedQueryFunction.GET_SPENDING_SUMMARY:
        return this.spendingSummary(
          userId,
          walletId,
          mascot,
          plan,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_TOP_CATEGORIES:
        return this.topCategories(
          userId,
          walletId,
          mascot,
          plan,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_WALLET_BALANCES:
        return this.walletBalances(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.COMPARE_PERIODS:
        return this.comparePeriods(
          userId,
          walletId,
          mascot,
          plan,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_RECENT_TRANSACTIONS:
        return this.recentTransactions(userId, walletId, mascot, plan);
      case CannedQueryFunction.GET_BUDGET_HEALTH:
        return this.budgetHealth(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_RULE_50_30_20:
        return this.rule503020(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_SPENDING_HABITS:
        return this.spendingHabits(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
        );
      case CannedQueryFunction.GET_DEBT_SUMMARY:
        return this.debtSummary(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
          plan,
        );
      case CannedQueryFunction.GET_CASHFLOW_SAVINGS:
        return this.cashflowSavings(
          userId,
          walletId,
          mascot,
          userText,
          systemPrompt,
        );
      default:
        return this.unsupported(mascot);
    }
  }

  unsupported(mascot: MascotCode): ExecuteCannedQueryResult {
    return {
      messageType: ChatMessageType.TEXT,
      textContent: this.tone.say(mascot, 'unsupported'),
      payloadJson: {
        supportedQueries: this.definitions.map((d) => ({
          name: d.name,
          description: d.description,
        })),
      },
    };
  }

  /**
   * Tổng hợp thu/chi theo khoảng ngày qua DashboardService (SQL aggregate tối ưu, không tải mảng vào RAM).
   */
  async summarizeRange(
    userId: string,
    walletId: string,
    from: string,
    to: string,
  ): Promise<SpendingSummaryRangeResult> {
    const data = await this.dashboardService.getSpendingSummaryByRange(
      userId,
      walletId,
      from,
      to,
    );

    return {
      transactionCount: data.transactionCount,
      totalExpense: data.totalExpense,
      totalIncome: data.totalIncome,
      byCategory: data.categories.map((c) => ({
        label: c.name,
        value: c.amount,
      })),
      categories: data.categories,
    };
  }

  // ── Các hàm truy vấn ───────────────────────────────────────────────────────

  private async spendingSummary(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    plan: CannedQueryPlan,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const range = resolveRange(plan.params.timeRange);
    const s = await this.summarizeRange(userId, walletId, range.from, range.to);
    const base = {
      functionName: CannedQueryFunction.GET_SPENDING_SUMMARY,
      timeRange: range.range,
      periodLabel: range.label,
      from: range.from,
      to: range.to,
    };

    if (s.transactionCount === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', { period: range.label }),
        payloadJson: { ...base, empty: true },
      };
    }

    if (plan.params.categoryName) {
      const key = normalizeForMatch(plan.params.categoryName);
      const matched = s.categories.find(
        (c) => normalizeForMatch(c.name) === key,
      );
      const total = matched ? matched.amount : 0;
      const count = matched ? matched.count : 0;
      const pct =
        s.totalExpense > 0 ? Math.round((total / s.totalExpense) * 100) : 0;

      const fallbackText =
        count > 0
          ? this.tone.say(mascot, 'spendingCategory', {
              period: range.label,
              category: plan.params.categoryName,
              total: formatMoney(total),
              pct,
              count,
            })
          : this.tone.say(mascot, 'noData', { period: range.label });

      let textContent = fallbackText;
      if (count > 0) {
        const insightPrompt = `[BỐI CẢNH DỮ LIỆU CHI TIÊU - 1 DANH MỤC]:\n- Kỳ phân tích: ${range.label}\n- Danh mục: ${plan.params.categoryName}\n- Tổng tiền đã chi: ${formatMoney(total)} (${count} giao dịch)\n- Tỷ trọng trên tổng chi tiêu: ${pct}%\n- Câu hỏi người dùng: "${userText || ''}"\nHãy đưa ra nhận xét ngắn gọn và 1 lời khuyên tài chính thiết thực cho danh mục này theo đúng phong cách của bạn (khoảng 2-3 câu).`;
        textContent = await this.tone.sayChartInsight(
          mascot,
          insightPrompt,
          fallbackText,
          systemPrompt,
        );
      }

      return {
        messageType: ChatMessageType.STAT_CARD,
        textContent,
        payloadJson: {
          ...base,
          categoryName: plan.params.categoryName,
          total,
          totalFormatted: formatMoney(total),
          percentOfExpense: pct,
          transactionCount: count,
        },
      };
    }

    const pie = this.chartBuilder.buildPie(s.byCategory);
    const fallbackText = this.tone.say(mascot, 'spending', {
      period: range.label,
      total: formatMoney(s.totalExpense),
      count: s.transactionCount,
    });

    const categoryBreakdown = s.categories
      .slice(0, 5)
      .map(
        (c) =>
          `${c.name}: ${formatMoney(c.amount)} (${Math.round((c.amount / (s.totalExpense || 1)) * 100)}%)`,
      )
      .join(', ');

    const insightPrompt = `[BỐI CẢNH DỮ LIỆU BIỂU ĐỒ PHÂN BỔ CHI TIÊU]:\n- Kỳ phân tích: ${range.label}\n- Tổng chi tiêu: ${formatMoney(s.totalExpense)} (${s.transactionCount} giao dịch)\n- Tổng thu nhập: ${formatMoney(s.totalIncome)} (Thặng dư thuần: ${formatMoney(s.totalIncome - s.totalExpense)})\n- Cơ cấu các danh mục: ${categoryBreakdown || 'Không có chi tiết'}\n- Câu hỏi người dùng: "${userText || ''}"\nHãy đưa ra 1 đoạn nhận xét tài chính thông minh dựa trên số liệu thực tế này, phân tích các danh mục chiếm tỷ lệ cao và đưa ra lời khuyên thiết thực theo đúng phong cách của bạn! Giữ câu trả lời súc tích, tự nhiên (khoảng 3-4 câu).`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_PIE,
      textContent,
      payloadJson: {
        ...base,
        chartType: 'pie',
        totalExpense: s.totalExpense,
        totalIncome: s.totalIncome,
        net: s.totalIncome - s.totalExpense,
        transactionCount: s.transactionCount,
        data: pie.data,
      },
    };
  }

  private async topCategories(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    plan: CannedQueryPlan,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const range = resolveRange(plan.params.timeRange);
    const limit = Math.min(Math.max(plan.params.limit ?? 5, 1), 10);
    const s = await this.summarizeRange(userId, walletId, range.from, range.to);
    const base = {
      functionName: CannedQueryFunction.GET_TOP_CATEGORIES,
      timeRange: range.range,
      periodLabel: range.label,
      from: range.from,
      to: range.to,
      limit,
    };

    if (!s.byCategory.length) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', { period: range.label }),
        payloadJson: { ...base, empty: true },
      };
    }

    const bar = this.chartBuilder.buildBar(s.byCategory, limit);
    const fallbackText = this.tone.say(mascot, 'top', {
      period: range.label,
      top: bar.data[0]?.label ?? '',
    });

    const topItemsStr = bar.data
      .map((d) => `${d.label}: ${formatMoney(d.value)} (${d.percentage}%)`)
      .join(', ');

    const insightPrompt = `[BỐI CẢNH BIỂU ĐỒ TOP DANH MỤC CHI TIÊU]:\n- Kỳ phân tích: ${range.label}\n- Top ${limit} danh mục chi tiêu lớn nhất: ${topItemsStr}\n- Tổng chi tiêu trong kỳ: ${formatMoney(s.totalExpense)}\n- Câu hỏi người dùng: "${userText || ''}"\nHãy đưa ra nhận xét về các khoản chi tiêu hàng đầu này và lời khuyên tối ưu chi phí theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        ...base,
        chartType: 'bar',
        totalExpense: s.totalExpense,
        data: bar.data,
      },
    };
  }

  private async walletBalances(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const page = await this.accountsService.listAccounts(userId, {
      walletId,
      page: 1,
      limit: 100,
      isArchived: false,
    } as any);
    const accounts = (page as any)?.items ?? [];
    const totalBalance = accounts.reduce(
      (s: number, a: any) => s + (Number(a.balance) || 0),
      0,
    );
    const currency = accounts[0]?.currency || 'VND';
    const mixedCurrency =
      new Set(accounts.map((a: any) => a.currency || 'VND')).size > 1;

    const fallbackText = this.tone.say(mascot, 'balance', {
      balance: formatMoney(totalBalance, currency),
    });

    const accountsStr = accounts
      .map(
        (a: any) =>
          `${a.name}: ${formatMoney(Number(a.balance) || 0, a.currency || currency)}`,
      )
      .join(', ');

    const insightPrompt = `[BỐI CẢNH THẺ SỐ DƯ TỔNG TÀI SẢN]:\n- Tổng số dư khả dụng: ${formatMoney(totalBalance, currency)}\n- Chi tiết các tài khoản: ${accountsStr || 'Chưa liên kết tài khoản'}\n- Câu hỏi người dùng: "${userText || ''}"\nHãy đưa ra nhận định ngắn gọn về sức khỏe tài chính / khả năng thanh khoản hiện tại và 1 lời khuyên quản lý dòng tiền theo phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.STAT_CARD,
      textContent,
      payloadJson: {
        functionName: CannedQueryFunction.GET_WALLET_BALANCES,
        totalBalance,
        totalBalanceFormatted: formatMoney(totalBalance, currency),
        currency,
        mixedCurrency,
        accountCount: accounts.length,
        accounts: accounts.map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance) || 0,
          currency: a.currency || 'VND',
          balanceFormatted: formatMoney(Number(a.balance) || 0, a.currency),
        })),
      },
    };
  }

  private async comparePeriods(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    plan: CannedQueryPlan,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const range = resolveRange(plan.params.timeRange);
    const [cur, prev] = await Promise.all([
      this.summarizeRange(userId, walletId, range.from, range.to),
      this.summarizeRange(
        userId,
        walletId,
        range.previous.from,
        range.previous.to,
      ),
    ]);
    const base = {
      functionName: CannedQueryFunction.COMPARE_PERIODS,
      timeRange: range.range,
      periodLabel: range.label,
      previousLabel: range.previous.label,
    };

    if (cur.transactionCount === 0 && prev.transactionCount === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', {
          period: `${range.label} và ${range.previous.label}`,
        }),
        payloadJson: { ...base, empty: true },
      };
    }

    const chart = this.chartBuilder.buildComparison(
      { label: range.label, value: cur.totalExpense },
      { label: range.previous.label, value: prev.totalExpense },
    );

    const prevMap = new Map(prev.byCategory.map((i) => [i.label, i.value]));
    const curMap = new Map(cur.byCategory.map((i) => [i.label, i.value]));
    const labels = new Set([...prevMap.keys(), ...curMap.keys()]);
    const categoryChanges = [...labels]
      .map((label) => ({
        label,
        current: curMap.get(label) ?? 0,
        previous: prevMap.get(label) ?? 0,
        delta: (curMap.get(label) ?? 0) - (prevMap.get(label) ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);

    const key =
      chart.direction === 'up'
        ? 'compareUp'
        : chart.direction === 'down'
          ? 'compareDown'
          : 'compareSame';

    const fallbackText = this.tone.say(mascot, key, {
      period: range.label,
      previous: range.previous.label,
      total: formatMoney(cur.totalExpense),
      delta: formatMoney(chart.deltaAbs),
      pct: chart.deltaPercent ?? '—',
    });

    const changesStr = categoryChanges
      .map(
        (c) =>
          `${c.label}: ${c.delta > 0 ? '+' : ''}${formatMoney(c.delta)} (kỳ này: ${formatMoney(c.current)}, kỳ trước: ${formatMoney(c.previous)})`,
      )
      .join('; ');

    const insightPrompt = `[BỐI CẢNH BIỂU ĐỒ SO SÁNH CHI TIÊU 2 KỲ]:\n- Kỳ hiện tại (${range.label}): ${formatMoney(cur.totalExpense)}\n- Kỳ trước (${range.previous.label}): ${formatMoney(prev.totalExpense)}\n- Biến động: ${chart.direction === 'up' ? 'Tăng' : chart.direction === 'down' ? 'Giảm' : 'Tương đương'} ${formatMoney(chart.deltaAbs)} (${chart.deltaPercent ?? 0}%)\n- Các danh mục biến động lớn nhất: ${changesStr || 'Không có'}\n- Câu hỏi người dùng: "${userText || ''}"\nHãy đưa ra nhận xét sâu sắc về xu hướng chi tiêu này (khen ngợi nếu tiết kiệm tốt, cảnh báo nếu tăng đột biến) và 1 lời khuyên điều chỉnh tài chính theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        ...base,
        ...chart,
        currentTotal: cur.totalExpense,
        previousTotal: prev.totalExpense,
        categoryChanges,
      },
    };
  }

  private async recentTransactions(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    plan: CannedQueryPlan,
  ): Promise<ExecuteCannedQueryResult> {
    const limit = Math.min(
      Math.max(
        plan.params.limit ?? AI_CHAT_CONFIG.RECENT_TRANSACTIONS_LIMIT,
        1,
      ),
      20,
    );
    const txs = await this.dashboardService.getRecentTransactions(
      userId,
      walletId,
      limit,
    );

    if (!txs.length) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', {
          period: 'thời gian gần đây',
        }),
        payloadJson: {
          functionName: CannedQueryFunction.GET_RECENT_TRANSACTIONS,
          empty: true,
        },
      };
    }

    return {
      messageType: ChatMessageType.TRANSACTION_LIST,
      textContent: this.tone.say(mascot, 'recent', { count: txs.length }),
      payloadJson: {
        functionName: CannedQueryFunction.GET_RECENT_TRANSACTIONS,
        items: txs.map((t) => ({
          name: t.name,
          amount: t.amount,
          amountFormatted: formatMoney(t.amount),
          type: t.type,
          categoryName: t.categoryName,
          date: t.date,
        })),
      },
    };
  }

  // ── 5 Canned Queries Mới Bổ Sung ──────────────────────────────────────────

  private async budgetHealth(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const data = await this.dashboardService.getBudgetHealth(userId, {
      walletId,
      month: currentMonth,
    });

    const base = {
      functionName: CannedQueryFunction.GET_BUDGET_HEALTH,
      month: currentMonth,
      totalBudgetLimit: data.totalBudgetLimit,
      totalSpent: data.totalSpent,
      remainingBudget: data.remainingBudget,
      spentPercentage: data.spentPercentage,
      burnRateMetrics: data.burnRateMetrics,
    };

    if (data.totalBudgetLimit === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent:
          'Bạn chưa thiết lập hạn mức ngân sách cho tháng này. Hãy tạo ngân sách trong mục Ngân Sách để tôi theo dõi tiến độ chi tiêu cho bạn nhé!',
        payloadJson: { ...base, empty: true },
      };
    }

    const fallbackText = `Ngân sách tháng ${currentMonth}: đã dùng ${formatMoney(data.totalSpent)} / ${formatMoney(data.totalBudgetLimit)} (${data.spentPercentage}%). Còn lại ${formatMoney(data.remainingBudget)} cho ${data.daysRemaining} ngày.`;

    const topBudgetCats = data.categoryBudgets
      .slice(0, 5)
      .map(
        (b) =>
          `${b.categoryName}: đã dùng ${formatMoney(b.spentAmount)} / ${formatMoney(b.limitAmount)} (${b.spentPercentage}%)`,
      )
      .join(', ');

    const insightPrompt = `[BỐI CẢNH TIẾN ĐỘ NGÂN SÁCH & TỐC ĐỘ TIÊU TIỀN THÁNG NÀY]:
- Tổng hạn mức ngân sách: ${formatMoney(data.totalBudgetLimit)}
- Đã chi tiêu: ${formatMoney(data.totalSpent)} (${data.spentPercentage}%)
- Ngân sách còn lại: ${formatMoney(data.remainingBudget)} (${data.daysRemaining} ngày còn lại trong tháng)
- Tốc độ chi tiêu thực tế mỗi ngày: ${formatMoney(data.burnRateMetrics.actualDailyBurnRate)}/ngày
- Hạn mức an toàn mỗi ngày còn lại: ${formatMoney(data.burnRateMetrics.recommendedDailyBurnRate)}/ngày
- Dự báo cuối tháng: ${data.burnRateMetrics.willOverspend ? `CẢNH BÁO: Dự kiến VƯỢT NGÂN SÁCH ${formatMoney(data.burnRateMetrics.estimatedOverspendAmount)}, ngày cạn tiền dự kiến: ${data.burnRateMetrics.projectedRunwayDate}` : 'NẰM TRONG HẠN MỨC AN TOÀN'}
- Chi tiết các danh mục: ${topBudgetCats || 'Chưa chia theo danh mục'}
- Câu hỏi người dùng: "${userText || ''}"
Hãy đưa ra 1 đoạn nhận xét tài chính trực diện, đánh giá xem người dùng có đang chi tiêu quá nhanh hay không và 1 lời khuyên điều chỉnh hạn mức mỗi ngày theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.STAT_CARD,
      textContent,
      payloadJson: {
        ...base,
        categoryName: 'Tổng ngân sách tháng',
        total: data.totalSpent,
        totalFormatted: formatMoney(data.totalSpent),
        percentOfExpense: Math.min(100, Math.round(data.spentPercentage)),
        periodLabel: `Tháng ${currentMonth.slice(5)} (Còn ${data.daysRemaining} ngày)`,
        transactionCount: data.daysPassed,
        categoryBudgets: data.categoryBudgets,
      },
    };
  }

  private async rule503020(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const data = await this.dashboardService.getCategoryBreakdown(userId, {
      walletId,
      type: CategoryBreakdownType.EXPENSE,
      month: currentMonth,
    });

    const rule = data.rule503020Evaluation;
    const base = {
      functionName: CannedQueryFunction.GET_RULE_50_30_20,
      month: currentMonth,
      totalAmount: data.totalAmount,
      rule503020: rule,
    };

    if (!rule || data.totalAmount === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', {
          period: 'tháng này để phân tích quy tắc 50/30/20',
        }),
        payloadJson: { ...base, empty: true },
      };
    }

    const barData = [
      {
        label: 'Thiết yếu (50%)',
        value: rule.needs.amount,
        percentage: rule.needs.percentage,
      },
      {
        label: 'Hưởng thụ (30%)',
        value: rule.wants.amount,
        percentage: rule.wants.percentage,
      },
      {
        label: 'Tích lũy (20%)',
        value: rule.savings.amount,
        percentage: rule.savings.percentage,
      },
    ];

    const fallbackText = `Đánh giá quy tắc 50/30/20 tháng này: Nhu cầu thiết yếu ${rule.needs.percentage}% (chuẩn 50%), Hưởng thụ ${rule.wants.percentage}% (chuẩn 30%), Tích lũy ${rule.savings.percentage}% (chuẩn 20%).`;

    const insightPrompt = `[BỐI CẢNH ĐÁNH GIÁ QUY TẮC TÀI CHÍNH 50/30/20 THÁNG NÀY]:
- Tổng chi tiêu: ${formatMoney(data.totalAmount)}
- Nhu cầu thiết yếu (Needs): ${formatMoney(rule.needs.amount)} (${rule.needs.percentage}% - Chuẩn: 50% - Đánh giá: ${rule.needs.status})
- Chi tiêu hưởng thụ (Wants): ${formatMoney(rule.wants.amount)} (${rule.wants.percentage}% - Chuẩn: 30% - Đánh giá: ${rule.wants.status})
- Tích lũy & Đầu tư (Savings): ${formatMoney(rule.savings.amount)} (${rule.savings.percentage}% - Chuẩn: 20% - Đánh giá: ${rule.savings.status})
- Câu hỏi người dùng: "${userText || ''}"
Hãy đưa ra nhận xét sâu sắc về lối sống tài chính này, chỉ ra danh mục nào đang bị lệch chuẩn và 1 lời khuyên cân bằng lại chi tiêu theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        ...base,
        chartType: 'bar',
        totalExpense: data.totalAmount,
        data: barData,
      },
    };
  }

  private async spendingHabits(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const data = await this.dashboardService.getCashFlow(userId, {
      walletId,
      period: CashFlowPeriod.MONTH,
    });

    const heatmap = data.dayOfWeekHeatmap ?? [];
    const base = {
      functionName: CannedQueryFunction.GET_SPENDING_HABITS,
      dayOfWeekHeatmap: heatmap,
      timeOfDayDistribution: data.timeOfDayDistribution,
    };

    if (!heatmap.length || data.totalExpense === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', {
          period: 'để phân tích thói quen chi tiêu',
        }),
        payloadJson: { ...base, empty: true },
      };
    }

    const sortedDays = [...heatmap].sort(
      (a, b) => b.averageExpense - a.averageExpense,
    );
    const maxDay = sortedDays[0]?.averageExpense || 1;
    const barData = heatmap.map((d) => ({
      label: d.dayOfWeek,
      value: Math.round(d.averageExpense),
      percentage: Math.round((d.averageExpense / maxDay) * 100),
    }));

    const topDaysStr = sortedDays
      .slice(0, 3)
      .map((d) => `${d.dayOfWeek} (${formatMoney(d.averageExpense)}/ngày)`)
      .join(', ');

    const timeOfDay = data.timeOfDayDistribution;
    const timeOfDayStr = Object.values(timeOfDay)
      .map((t: any) => `${t.label}: ${t.percentage}%`)
      .join(', ');

    const fallbackText = `Thói quen chi tiêu: Bạn có xu hướng tiêu nhiều tiền nhất vào ${sortedDays[0]?.dayOfWeek}. Khung giờ hoạt động chi tiêu nhiều nhất: ${timeOfDayStr}.`;

    const insightPrompt = `[BỐI CẢNH THÓI QUEN CHI TIÊU THEO NGÀY & KHUNG GIỜ]:
- Tổng chi tiêu trong tháng: ${formatMoney(data.totalExpense)}
- Top các ngày tiêu nhiều tiền nhất: ${topDaysStr}
- Phân bổ theo khung giờ: ${timeOfDayStr}
- Câu hỏi người dùng: "${userText || ''}"
Hãy bóc trần thói quen chi tiêu của người dùng, phân tích tâm lý tại sao họ lại tiêu nhiều vào những ngày/giờ đó và 1 lời khuyên điều chỉnh thói quen thực tế theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        ...base,
        chartType: 'bar',
        totalExpense: data.totalExpense,
        data: barData,
      },
    };
  }

  private async debtSummary(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
    plan?: CannedQueryPlan,
  ): Promise<ExecuteCannedQueryResult> {
    const data = await this.dashboardService.getDebts(userId, { walletId });
    const base = {
      functionName: CannedQueryFunction.GET_DEBT_SUMMARY,
      totalReceivables: data.totalReceivables,
      totalPayables: data.totalPayables,
      netDebtPosition: data.netDebtPosition,
      debtToAssetRatio: data.debtToAssetRatio,
      overdueStats: data.overdueStats,
      timeRange: plan?.params?.timeRange,
    };

    if (data.totalReceivables === 0 && data.totalPayables === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent:
          'Bạn hiện không có khoản nợ phải trả nào (0 ₫) và cũng không có ai nợ bạn trong sổ nợ. Tình hình tài chính hoàn toàn tự do và trong sạch!',
        payloadJson: { ...base, empty: true },
      };
    }

    const fallbackText = `Sổ nợ tài chính: Bạn hiện đang nợ ${formatMoney(data.totalPayables)} (cần trả) và có người khác đang nợ bạn ${formatMoney(data.totalReceivables)} (cần thu hồi). Vị thế nợ ròng: ${formatMoney(data.netDebtPosition)}.`;

    const topDebtorsStr = data.topDebtors
      .slice(0, 5)
      .map(
        (d: any) =>
          `${d.counterpartyName} (${d.type === 'LENT' ? 'Nợ bạn' : 'Bạn nợ'}): ${formatMoney(d.remainingAmount)}${d.dueDate ? ` - hạn ${d.dueDate}` : ''}`,
      )
      .join('; ');

    const directQ = plan?.params?.directQuestion;
    const insightPrompt = `[BỐI CẢNH QUẢN LÝ SỔ NỢ & CHO VAY]:
- Tổng tiền nợ phải trả (bạn đang nợ): ${formatMoney(data.totalPayables)} (Có ${data.overdueStats.overduePayableCount} khoản quá hạn)
- Tổng tiền cho vay (người khác nợ bạn): ${formatMoney(data.totalReceivables)} (Có ${data.overdueStats.overdueReceivableCount} khoản quá hạn)
- Vị thế nợ ròng: ${formatMoney(data.netDebtPosition)}
- Tỷ lệ nợ trên tổng tài sản: ${data.debtToAssetRatio}%
- Các khoản nợ tiêu biểu: ${topDebtorsStr || 'Không có chi tiết'}
- Câu hỏi người dùng: "${userText || ''}"
${directQ ? `- Trọng tâm câu hỏi cụ thể: "${directQ}"` : ''}

YÊU CẦU TRẢ LỜI (RẤT QUAN TRỌNG):
1. TRẢ LỜI TRỰC DIỆN CON SỐ MÀ NGƯỜI DÙNG HỎI NGAY CÂU ĐẦU TIÊN: Nêu rõ hiện tại tổng số nợ cần trả là bao nhiêu tiền, và tổng tiền người khác nợ mình là bao nhiêu.
2. Đưa ra 1 nhận xét hoặc lời khuyên quản trị nợ nần sắc sảo theo đúng tính cách của bạn (khoảng 2 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.TRANSACTION_LIST,
      textContent,
      payloadJson: {
        ...base,
        items: data.topDebtors.map((d: any) => ({
          name: `${d.type === 'LENT' ? 'Cho vay' : 'Đi vay'}: ${d.counterpartyName}`,
          amount: d.remainingAmount,
          amountFormatted: formatMoney(d.remainingAmount),
          type: d.type === 'LENT' ? 'INCOME' : 'EXPENSE',
          categoryName: d.type === 'LENT' ? 'Khoản cần thu' : 'Khoản phải trả',
          date: d.dueDate ?? 'Chưa hẹn ngày',
        })),
      },
    };
  }

  private async cashflowSavings(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    userText?: string,
    systemPrompt?: string,
  ): Promise<ExecuteCannedQueryResult> {
    const data = await this.dashboardService.getExecutiveOverview(userId, {
      walletId,
    });
    const cf = data.monthlyCashflow;
    const base = {
      functionName: CannedQueryFunction.GET_CASHFLOW_SAVINGS,
      month: cf.month,
      income: cf.income,
      expense: cf.expense,
      netCashflow: cf.netCashflow,
      savingsRate: cf.savingsRate,
      momIncomeChange: cf.momIncomeChange,
      momExpenseChange: cf.momExpenseChange,
    };

    if (cf.income === 0 && cf.expense === 0) {
      return {
        messageType: ChatMessageType.TEXT,
        textContent: this.tone.say(mascot, 'noData', {
          period: 'tháng này để tính dòng tiền',
        }),
        payloadJson: { ...base, empty: true },
      };
    }

    const barData = [
      { label: 'Thu nhập', value: cf.income, percentage: 100 },
      {
        label: 'Chi tiêu',
        value: cf.expense,
        percentage: Math.round((cf.expense / (cf.income || 1)) * 100),
      },
      {
        label: 'Tích lũy ròng',
        value: Math.max(0, cf.netCashflow),
        percentage: Math.max(0, Math.round(cf.savingsRate)),
      },
    ];

    const fallbackText = `Dòng tiền tháng ${cf.month}: Tổng thu ${formatMoney(cf.income)}, Tổng chi ${formatMoney(cf.expense)}. Thặng dư ròng ${formatMoney(cf.netCashflow)} (Tỷ lệ tiết kiệm ${cf.savingsRate}%).`;

    const insightPrompt = `[BỐI CẢNH DÒNG TIỀN THUẦN & TỶ LỆ TIẾT KIỆM (SAVINGS RATE)]:
- Tháng phân tích: ${cf.month}
- Tổng thu nhập: ${formatMoney(cf.income)} (Biến động MoM: ${cf.momIncomeChange > 0 ? '+' : ''}${cf.momIncomeChange}%)
- Tổng chi tiêu: ${formatMoney(cf.expense)} (Biến động MoM: ${cf.momExpenseChange > 0 ? '+' : ''}${cf.momExpenseChange}%)
- Dòng tiền thặng dư thuần: ${formatMoney(cf.netCashflow)}
- Tỷ lệ tiết kiệm thực tế: ${cf.savingsRate}% thu nhập
- Câu hỏi người dùng: "${userText || ''}"
Hãy đưa ra nhận định tài chính sâu sắc về hiệu quả tích lũy dòng tiền này và 1 lời khuyên tài chính theo đúng phong cách của bạn (khoảng 2-3 câu)!`;

    const textContent = await this.tone.sayChartInsight(
      mascot,
      insightPrompt,
      fallbackText,
      systemPrompt,
    );

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        ...base,
        chartType: 'bar',
        totalExpense: cf.expense,
        data: barData,
      },
    };
  }
}
