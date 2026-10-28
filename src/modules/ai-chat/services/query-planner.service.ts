// src/modules/ai-chat/services/query-planner.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CategoryLite } from '../interfaces/ai-chat.types';
import { TimeRange } from '../utils/date.util';
import { containsPhrase, normalizeForMatch } from '../utils/text.util';
import { EntityExtractorService } from './entity-extractor.service';
import { ModelGatewayService } from './model-gateway.service';

export enum CannedQueryFunction {
  GET_SPENDING_SUMMARY = 'get_spending_summary',
  GET_WALLET_BALANCES = 'get_wallet_balances',
  GET_TOP_CATEGORIES = 'get_top_categories',
  COMPARE_PERIODS = 'compare_periods',
  GET_RECENT_TRANSACTIONS = 'get_recent_transactions',
  GET_BUDGET_HEALTH = 'get_budget_health',
  GET_RULE_50_30_20 = 'get_rule_50_30_20',
  GET_SPENDING_HABITS = 'get_spending_habits',
  GET_DEBT_SUMMARY = 'get_debt_summary',
  GET_CASHFLOW_SAVINGS = 'get_cashflow_savings',
}

export interface CannedQueryPlan {
  functionName: CannedQueryFunction | null;
  params: {
    timeRange: TimeRange;
    categoryName?: string;
    limit?: number;
    directQuestion?: string;
  };
  source?: 'llm_agent' | 'rule_fallback';
}

const BUDGET_HEALTH = [
  'ngan sach',
  'han muc',
  'boi chi',
  'vuot ngan sach',
  'chua het thang',
  'can tien',
  'het tien',
  'toc do tieu',
  'moi ngay tieu bao nhieu',
  'con lai bao nhieu ngan sach',
  'budget',
  'burn rate',
  'chay ngan sach',
  'tinh hinh ngan sach',
];

const RULE_50_30_20 = [
  '50 30 20',
  '50/30/20',
  'quy tac 50',
  'thiet yeu',
  'huong thu',
  'tich luy',
  'can doi tai chinh',
  'co cau chi tieu',
  'needs wants',
];

const SPENDING_HABITS = [
  'thoi quen',
  'hay tieu vao',
  'thu may',
  'khung gio',
  'buoi sang',
  'buoi trua',
  'buoi toi',
  'ngay nao tieu nhieu',
  'gio nao tieu',
  'heatmap',
  'bieu do nhiet',
];

const DEBT = [
  'no',
  'so no',
  'khoan no',
  'tien no',
  'con no',
  'chu no',
  'ai no',
  'no ai',
  'dang no',
  'tong no',
  'khoan vay',
  'cho vay',
  'di vay',
  'tra no',
  'thu hoi no',
  'danh sach no',
  'no nan',
  'no xau',
  'qua han',
  'vay muon',
  'muon no',
  'muon tien',
  'vay tien',
  'vay no',
  'no bao nhieu',
  'so no bao nhieu',
  'no thang',
];

const CASHFLOW = [
  'dong tien',
  'tiet kiem duoc',
  'de danh',
  'ty le tiet kiem',
  'savings rate',
  'thu nhap thang nay',
  'du bao nhieu',
  'thu nhap tru chi phi',
  'thang nay du',
];

const BALANCE = [
  'so du',
  'con bao nhieu tien',
  'con bao nhieu',
  'con lai bao nhieu',
  'tai khoan',
  'vi cua toi',
  'tong tai san',
  'dang co bao nhieu',
  'kiem tra so du',
  'tien trong vi',
  'so du hien tai',
  'tien con lai',
  'xem so du',
];

const COMPARE = [
  'so voi',
  'so sanh',
  'tang hon',
  'giam hon',
  'nhieu hon',
  'it hon',
  'khac gi',
  'doi chieu',
  'bien dong',
  'lech bao nhieu',
  'tang giam',
  'chenh lech',
  'so sanh voi',
];

const TOP = [
  'nhieu nhat',
  'top',
  'ngon nhieu',
  'ton nhieu',
  'danh muc nao',
  'khoan nao',
  'lon nhat',
  'cao nhat',
  'tieu nhieu nhat',
  'ton kem nhat',
  'chi nhieu nhat',
  'danh muc hang dau',
  'khoan chi lon',
];

const RECENT = [
  'gan day',
  'giao dich gan',
  'liet ke',
  'danh sach giao dich',
  'giao dich moi nhat',
  'lich su giao dich',
  'vua chi',
  'vua tieu',
  'moi chi',
  'giao dich vua qua',
  'da tieu gi',
  'tieu nhung gi',
  'da chi nhung gi',
  'cac khoan chi',
  'xem giao dich',
];

/**
 * QueryPlannerService:
 * Ưu tiên 1: Agentic LLM Function Calling (Gemini) để hiểu ngữ nghĩa sâu sắc của câu hỏi tự nhiên.
 * Fallback 2: Rule-based xác định (deterministic) với bộ từ khóa phong phú khi LLM bận/offline.
 */
@Injectable()
export class QueryPlannerService {
  private readonly logger = new Logger(QueryPlannerService.name);

  constructor(
    private readonly extractor: EntityExtractorService,
    private readonly gateway: ModelGatewayService,
  ) {}

  /**
   * Lập kế hoạch truy vấn tài chính:
   * 1. Thử gọi LLM Function Calling từ AI Service để hiểu sâu ngữ cảnh (nhận diện chính xác 1 trong 10 hàm).
   * 2. Nếu model không phản hồi hoặc timeout -> rơi về planByRules.
   */
  async plan(
    text: string,
    categories: CategoryLite[],
    hint?: string | null,
    today?: string,
  ): Promise<CannedQueryPlan> {
    // 1. Thử Agentic LLM Tool Calling trước
    if (this.gateway.isAvailable()) {
      try {
        const aiPlan = await this.gateway.planQuery(
          text,
          categories.map((c) => ({ id: c.id, name: c.name })),
          today,
        );

        if (aiPlan?.function_name && this.isValidFunction(aiPlan.function_name)) {
          const fn = aiPlan.function_name as CannedQueryFunction;
          const timeRange = this.parseTimeRange(aiPlan.time_range) ?? this.extractor.extractTimeRange(text);
          
          this.logger.log(
            `[Agentic QueryPlanner] AI Tool Call thành công: fn=${fn}, timeRange=${timeRange}, cat=${aiPlan.category_name}, directQ="${aiPlan.direct_question}"`,
          );

          return {
            functionName: fn,
            params: {
              timeRange,
              categoryName: aiPlan.category_name ?? undefined,
              limit: aiPlan.limit ? Math.min(20, Math.max(1, Number(aiPlan.limit))) : undefined,
              directQuestion: aiPlan.direct_question ?? undefined,
            },
            source: 'llm_agent',
          };
        }
      } catch (err) {
        this.logger.warn(`Agentic QueryPlanner thất bại, rơi về rule-based: ${(err as Error).message}`);
      }
    }

    // 2. Fallback Rule-based (được mở rộng đầy đủ từ khóa)
    return this.planByRules(text, categories, hint);
  }

  /**
   * Fallback Rule-based an toàn.
   */
  planByRules(
    text: string,
    categories: CategoryLite[],
    hint?: string | null,
  ): CannedQueryPlan {
    const norm = normalizeForMatch(text);
    const timeRange = this.extractor.extractTimeRange(text);
    const has = (list: string[]) => list.some((k) => containsPhrase(norm, k));
    const h = (hint || '').toLowerCase();

    let fn: CannedQueryFunction | null;
    if (has(DEBT) || h.includes('debt') || h.includes('loan'))
      fn = CannedQueryFunction.GET_DEBT_SUMMARY;
    else if (has(BUDGET_HEALTH) || h.includes('budget'))
      fn = CannedQueryFunction.GET_BUDGET_HEALTH;
    else if (has(RULE_50_30_20) || h.includes('50_30_20') || h.includes('rule'))
      fn = CannedQueryFunction.GET_RULE_50_30_20;
    else if (has(SPENDING_HABITS) || h.includes('habit'))
      fn = CannedQueryFunction.GET_SPENDING_HABITS;
    else if (has(CASHFLOW) || h.includes('cashflow') || h.includes('savings'))
      fn = CannedQueryFunction.GET_CASHFLOW_SAVINGS;
    else if (has(COMPARE) || h.includes('compare'))
      fn = CannedQueryFunction.COMPARE_PERIODS;
    else if (has(BALANCE) || h.includes('balance'))
      fn = CannedQueryFunction.GET_WALLET_BALANCES;
    else if (has(RECENT) || h.includes('recent') || h.includes('list'))
      fn = CannedQueryFunction.GET_RECENT_TRANSACTIONS;
    else if (has(TOP) || h.includes('top'))
      fn = CannedQueryFunction.GET_TOP_CATEGORIES;
    else fn = CannedQueryFunction.GET_SPENDING_SUMMARY;

    const params: CannedQueryPlan['params'] = { timeRange };
    const mentioned = categories
      .filter((c) => {
        const cn = normalizeForMatch(c.name);
        return cn.length >= 3 && containsPhrase(norm, cn);
      })
      .sort((a, b) => b.name.length - a.name.length)[0];
    if (mentioned && fn === CannedQueryFunction.GET_SPENDING_SUMMARY)
      params.categoryName = mentioned.name;

    const n = /\btop\s+(\d{1,2})\b/.exec(norm);
    if (n) params.limit = Math.min(10, Math.max(1, Number(n[1])));

    return { functionName: fn, params, source: 'rule_fallback' };
  }

  private isValidFunction(name: string): boolean {
    return Object.values(CannedQueryFunction).includes(name as CannedQueryFunction);
  }

  private parseTimeRange(val?: string | null): TimeRange | null {
    if (!val) return null;
    const upper = val.toUpperCase().trim();
    if (Object.values(TimeRange).includes(upper as TimeRange)) {
      return upper as TimeRange;
    }
    return null;
  }
}
