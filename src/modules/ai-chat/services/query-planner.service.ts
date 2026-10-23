// src/modules/ai-chat/services/query-planner.service.ts
import { Injectable } from '@nestjs/common';
import { CategoryLite } from '../interfaces/ai-chat.types';
import { TimeRange } from '../utils/date.util';
import { containsPhrase, normalizeForMatch } from '../utils/text.util';
import { EntityExtractorService } from './entity-extractor.service';

export enum CannedQueryFunction {
  GET_SPENDING_SUMMARY = 'get_spending_summary',
  GET_WALLET_BALANCES = 'get_wallet_balances',
  GET_TOP_CATEGORIES = 'get_top_categories',
  COMPARE_PERIODS = 'compare_periods',
  GET_RECENT_TRANSACTIONS = 'get_recent_transactions',
}

export interface CannedQueryPlan {
  functionName: CannedQueryFunction | null;
  params: { timeRange: TimeRange; categoryName?: string; limit?: number };
}

const BALANCE = [
  'so du',
  'con bao nhieu tien',
  'con lai bao nhieu',
  'tai khoan',
  'vi cua toi',
  'tong tai san',
  'dang co bao nhieu',
];
const COMPARE = [
  'so voi',
  'so sanh',
  'tang hon',
  'giam hon',
  'nhieu hon',
  'it hon',
  'khac gi',
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
];
const RECENT = [
  'gan day',
  'giao dich gan',
  'liet ke',
  'danh sach giao dich',
  'giao dich moi nhat',
  'lich su giao dich',
];

/**
 * "Function calling" xác định (deterministic): intent + thực thể -> 1 hàm trong danh mục canned query đã được phê duyệt.
 * Không để model tự sinh tên hàm/SQL nên không thể gọi nhầm hàm nguy hiểm.
 */
@Injectable()
export class QueryPlannerService {
  constructor(private readonly extractor: EntityExtractorService) {}

  plan(
    text: string,
    categories: CategoryLite[],
    hint?: string | null,
  ): CannedQueryPlan {
    const norm = normalizeForMatch(text);
    const timeRange = this.extractor.extractTimeRange(text);
    const has = (list: string[]) => list.some((k) => containsPhrase(norm, k));
    const h = (hint || '').toLowerCase();

    let fn: CannedQueryFunction | null;
    if (has(COMPARE) || h.includes('compare'))
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
    return { functionName: fn, params };
  }
}
