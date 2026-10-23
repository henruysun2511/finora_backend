// src/modules/ai-chat/services/category-classifier.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { getAiModelConfig } from '../../../config/ai-model.config';
import {
  CATEGORY_KEYWORD_GROUPS,
  CategoryKeywordGroup,
  getKeywordGroup,
} from '../constants/category-keywords.constant';
import { CategoryLite, CategoryResolution } from '../interfaces/ai-chat.types';
import {
  containsPhrase,
  normalizeForMatch,
  normalizeKeepDiacritics,
  capitalizeFirst,
} from '../utils/text.util';
import { ModelGatewayService } from './model-gateway.service';

const EMPTY: CategoryResolution = {
  categoryId: null,
  categoryName: null,
  categoryKey: null,
  confidence: 0,
  source: 'none',
  suggestedNewCategory: null,
};

/**
 * Category Classification 3 lớp (ai-flow.md, model cần train #2):
 *  0) Người dùng nói thẳng tên danh mục  ->  1) Model PhoBERT (confidence >= ngưỡng)  ->  2) Rule-based keyword.
 * Không tìm được -> trả "none" kèm gợi ý TÊN danh mục mới để người dùng chọn/tạo (không đoán bừa).
 */
@Injectable()
export class CategoryClassifierService {
  private readonly logger = new Logger(CategoryClassifierService.name);

  constructor(private readonly gateway: ModelGatewayService) {}

  async resolve(
    text: string,
    itemName: string,
    type: TransactionType,
    categories: CategoryLite[],
  ): Promise<CategoryResolution> {
    const pool = categories.filter((c) => c.type === type);
    const input = `${itemName} ${text}`.trim();

    // 0) Nhắc thẳng tên danh mục
    const mentioned = this.findMentioned(text, pool);
    if (mentioned) {
      return {
        categoryId: mentioned.id,
        categoryName: mentioned.name,
        categoryKey: this.keyOfCategory(mentioned, type),
        confidence: 0.95,
        source: 'mention',
        suggestedNewCategory: null,
      };
    }

    // 1) Model
    const cfg = getAiModelConfig();
    if (pool.length && this.gateway.isAvailable()) {
      try {
        const raw = await this.gateway.postJson<{
          category?: string;
          label?: string;
          confidence?: number;
          score?: number;
        }>(
          '/category',
          { text: itemName || text, type, candidates: pool.map((c) => c.name) },
          { timeoutMs: cfg.timeouts.nlpMs },
        );
        const label = raw?.category ?? raw?.label;
        const confidence = Number(raw?.confidence ?? raw?.score);
        if (
          label &&
          Number.isFinite(confidence) &&
          confidence >= cfg.categoryThreshold
        ) {
          const mapped = this.mapLabelToCategory(String(label), pool);
          if (mapped) {
            return {
              categoryId: mapped.id,
              categoryName: mapped.name,
              categoryKey: this.keyOfCategory(mapped, type),
              confidence,
              source: 'model',
              suggestedNewCategory: null,
            };
          }
        }
      } catch (err) {
        this.logger.warn(
          `Category model lỗi, dùng rule-based: ${(err as Error).message}`,
        );
      }
    }

    // 2) Rule-based
    const group = this.bestKeywordGroup(input, type);
    if (group) {
      const mapped = this.mapGroupToCategory(group, pool);
      if (mapped) {
        return {
          categoryId: mapped.id,
          categoryName: mapped.name,
          categoryKey: group.key,
          confidence: 0.7,
          source: 'rule',
          suggestedNewCategory: null,
        };
      }
      // Nhận diện được nhóm nhưng người dùng chưa có danh mục tương ứng -> gợi ý tạo mới
      return {
        ...EMPTY,
        categoryKey: group.key,
        suggestedNewCategory: group.displayName,
      };
    }

    return {
      ...EMPTY,
      suggestedNewCategory: itemName
        ? capitalizeFirst(itemName.split(/\s+/).slice(0, 3).join(' '))
        : null,
    };
  }

  /** Khoá nhóm (food, transport...) của một danh mục thật; dùng cho Advice. */
  keyOfCategory(category: CategoryLite, type: TransactionType): string | null {
    const cn = normalizeForMatch(category.name);
    for (const g of CATEGORY_KEYWORD_GROUPS) {
      if (g.type !== type) continue;
      if (g.aliases.some((a) => cn === a || containsPhrase(cn, a)))
        return g.key;
    }
    return null;
  }

  // ── nội bộ ────────────────────────────────────────────────────────────────

  private findMentioned(
    text: string,
    pool: CategoryLite[],
  ): CategoryLite | null {
    const norm = normalizeForMatch(text);
    let best: CategoryLite | null = null;
    for (const c of pool) {
      const cn = normalizeForMatch(c.name);
      if (
        cn.length >= 3 &&
        containsPhrase(norm, cn) &&
        (!best || cn.length > normalizeForMatch(best.name).length)
      )
        best = c;
    }
    return best;
  }

  private mapLabelToCategory(
    label: string,
    pool: CategoryLite[],
  ): CategoryLite | null {
    const ln = normalizeForMatch(label);
    const exact = pool.find((c) => normalizeForMatch(c.name) === ln);
    if (exact) return exact;
    const group = CATEGORY_KEYWORD_GROUPS.find(
      (g) => g.key === ln || normalizeForMatch(g.displayName) === ln,
    );
    return group ? this.mapGroupToCategory(group, pool) : null;
  }

  private mapGroupToCategory(
    group: CategoryKeywordGroup,
    pool: CategoryLite[],
  ): CategoryLite | null {
    for (const c of pool) {
      const cn = normalizeForMatch(c.name);
      if (
        group.aliases.some(
          (a) =>
            cn === a ||
            containsPhrase(cn, a) ||
            (cn.length >= 4 && containsPhrase(a, cn)),
        )
      )
        return c;
    }
    return null;
  }

  private bestKeywordGroup(
    input: string,
    type: TransactionType,
  ): CategoryKeywordGroup | null {
    const loose = normalizeForMatch(input);
    const keep = normalizeKeepDiacritics(input);
    let best: { group: CategoryKeywordGroup; score: number } | null = null;

    for (const group of CATEGORY_KEYWORD_GROUPS) {
      if (group.type !== type) continue;
      let score = 0;
      for (const kw of group.keywords) {
        const sensitive = kw.startsWith('=');
        const phrase = sensitive ? kw.slice(1) : kw;
        const hit = sensitive
          ? containsPhrase(keep, phrase)
          : containsPhrase(loose, phrase);
        if (hit) score += phrase.split(' ').length + (sensitive ? 0.5 : 0);
      }
      if (score > 0 && (!best || score > best.score)) best = { group, score };
    }
    return best ? (getKeywordGroup(best.group.key) ?? null) : null;
  }
}
