// src/modules/ai-chat/services/canned-query.registry.ts
import { Injectable, Logger } from '@nestjs/common';
import { AccountsService } from '../../accounts/accounts.service';
import { DashboardService } from '../../dashboards/dashboards.service';
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
  }): Promise<ExecuteCannedQueryResult> {
    const { plan, userId, walletId, mascot } = params;
    switch (plan.functionName) {
      case CannedQueryFunction.GET_SPENDING_SUMMARY:
        return this.spendingSummary(userId, walletId, mascot, plan);
      case CannedQueryFunction.GET_TOP_CATEGORIES:
        return this.topCategories(userId, walletId, mascot, plan);
      case CannedQueryFunction.GET_WALLET_BALANCES:
        return this.walletBalances(userId, walletId, mascot);
      case CannedQueryFunction.COMPARE_PERIODS:
        return this.comparePeriods(userId, walletId, mascot, plan);
      case CannedQueryFunction.GET_RECENT_TRANSACTIONS:
        return this.recentTransactions(userId, walletId, mascot, plan);
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

      return {
        messageType: ChatMessageType.STAT_CARD,
        textContent: count > 0
          ? this.tone.say(mascot, 'spendingCategory', {
              period: range.label,
              category: plan.params.categoryName,
              total: formatMoney(total),
              pct,
              count,
            })
          : this.tone.say(mascot, 'noData', { period: range.label }),
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
    return {
      messageType: ChatMessageType.CHART_PIE,
      textContent: this.tone.say(mascot, 'spending', {
        period: range.label,
        total: formatMoney(s.totalExpense),
        count: s.transactionCount,
      }),
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
    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent: this.tone.say(mascot, 'top', {
        period: range.label,
        top: bar.data[0]?.label ?? '',
      }),
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

    return {
      messageType: ChatMessageType.STAT_CARD,
      textContent: this.tone.say(mascot, 'balance', {
        balance: formatMoney(totalBalance, currency),
      }),
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

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent: this.tone.say(mascot, key, {
        period: range.label,
        previous: range.previous.label,
        total: formatMoney(cur.totalExpense),
        delta: formatMoney(chart.deltaAbs),
        pct: chart.deltaPercent ?? '—',
      }),
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
}
