// src/modules/ai-chat/services/intent-classifier.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { getAiModelConfig } from '../../../config/ai-model.config';
import { AI_DEFAULT_THRESHOLDS } from '../constants';
import { AiIntent, normalizeIntentLabel } from '../enums/ai-intent.enum';
import { ModelGatewayService } from './model-gateway.service';
import { parseAmounts } from '../utils/amount.parser';
import { normalizeForMatch, containsPhrase } from '../utils/text.util';

export interface IntentResult {
  intent: AiIntent;
  confidence: number;
  source: 'model' | 'rule' | 'override';
  /** Nhãn con của model (vd query_top_category) giúp QueryPlanner chọn hàm. */
  queryHint?: string | null;
}

const HARD_OOS = [
  'bitcoin',
  'btc',
  'eth',
  'crypto',
  'tien ao',
  'coin',
  'chung khoan',
  'co phieu',
  'forex',
  'gia vang',
  'thoi tiet',
  'du bao',
  'viet code',
  'lap trinh',
  'javascript',
  'python',
  'chinh tri',
  'bong da',
  'cong thuc nau',
  'dich sang',
  'bai tho',
  'giai toan',
  'tin tuc',
  'tong thong',
  'xo so',
  'bat dong san',
];
const SOFT_OOS_RE =
  /\b(nen (an|uong|mac|di|xem)|an gi|uong gi|di dau|mac gi|nen (an|uong) .* hay)\b/;
const QUERY_WORDS = [
  'bao nhieu',
  'nhieu nhat',
  'so voi',
  'so sanh',
  'thong ke',
  'bao cao',
  'tong chi',
  'tong thu',
  'so du',
  'con lai',
  'top',
  'liet ke',
  'danh sach giao dich',
  'giao dich gan day',
  'bieu do',
  'chi tieu',
  'thu nhap',
  'tieu nhieu',
  'ton nhieu',
  'ngon nhieu',
  'danh muc nao',
  'chi cho',
  'da chi',
  'da tieu',
];
const GREETING_RE =
  /\b(chao|xin chao|hello|hi|hey|alo|khoe khong|ban la ai|cam on|thanks|tam biet|bye|co khoe|dang lam gi)\b/;
const ADVICE_RE =
  /\b(loi khuyen|tiet kiem|meo|lam sao de|nen lam gi|quan ly (tai chinh|tien)|goi y|huong dan|cach (tiet kiem|quan ly))\b/;
const INCOME_EXPENSE_VERBS =
  /\b(an|uong|mua|tra|chi|tieu|dong|nap|luong|thuong|nhan|thu|ban|mat|het|gui|dat|thue|ve)\b/;

/**
 * Intent Classification (ai-flow.md, model cần train #1).
 * Thứ tự: model PhoBERT (nếu cấu hình + còn khoẻ) -> rule-based. Model confidence thấp -> coi là INTENT_UNCLEAR
 * (trừ khi rule-based cực kỳ chắc chắn).
 */
@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(private readonly gateway: ModelGatewayService) {}

  async classify(text: string): Promise<IntentResult> {
    const rule = this.classifyByRules(text);
    const cfg = getAiModelConfig();

    if (this.gateway.isAvailable()) {
      try {
        const raw = await this.gateway.postJson<{
          intent?: string;
          label?: string;
          confidence?: number;
          score?: number;
        }>('/intent', { text }, { timeoutMs: cfg.timeouts.nlpMs });

        const label = raw?.intent ?? raw?.label;
        const confidence = Number(raw?.confidence ?? raw?.score);
        const intent = normalizeIntentLabel(label);

        if (intent && Number.isFinite(confidence)) {
          if (confidence >= cfg.intentThreshold) {
            return {
              intent,
              confidence,
              source: 'model',
              queryHint:
                intent === AiIntent.QUERY_SPENDING
                  ? String(label).toLowerCase()
                  : null,
            };
          }
          // Model không chắc: chỉ tin rule khi rule rất chắc, nếu không -> hỏi lại người dùng
          if (rule.confidence >= AI_DEFAULT_THRESHOLDS.RULE_OVERRIDE)
            return rule;
          return {
            intent: AiIntent.INTENT_UNCLEAR,
            confidence,
            source: 'model',
          };
        }
        this.logger.warn(
          `Phản hồi /intent không hợp lệ: ${JSON.stringify(raw)?.slice(0, 120)}`,
        );
      } catch (err) {
        this.logger.warn(
          `Intent model lỗi, dùng rule-based: ${(err as Error).message}`,
        );
      }
    }
    return rule;
  }

  /** Rule-based fallback (cũng là lớp "an toàn" khi chưa train xong model). */
  classifyByRules(text: string): IntentResult {
    const raw = (text ?? '').trim();
    const norm = normalizeForMatch(raw);
    if (norm.length <= 2 || /^[?.!\s]+$/.test(raw)) {
      return {
        intent: AiIntent.INTENT_UNCLEAR,
        confidence: 0.6,
        source: 'rule',
      };
    }

    const hasAmount = parseAmounts(raw).length > 0;
    const hasQuestionMark = /[?？]/.test(raw);
    const hasQueryWord = QUERY_WORDS.some((w) => containsPhrase(norm, w));
    const hardOos = HARD_OOS.some((w) => containsPhrase(norm, w));

    if (hardOos && !hasAmount)
      return {
        intent: AiIntent.OUT_OF_SCOPE,
        confidence: 0.92,
        source: 'rule',
      };

    const strongQuery =
      hasQueryWord &&
      (hasQuestionMark ||
        !hasAmount ||
        /\b(bao nhieu|so voi|so sanh|nhieu nhat)\b/.test(norm));
    if (strongQuery) {
      return {
        intent: AiIntent.QUERY_SPENDING,
        confidence: 0.88,
        source: 'rule',
        queryHint: null,
      };
    }

    if (hasAmount && INCOME_EXPENSE_VERBS.test(norm)) {
      return {
        intent: AiIntent.ADD_TRANSACTION,
        confidence: 0.92,
        source: 'rule',
      };
    }
    if (hasAmount)
      return {
        intent: AiIntent.ADD_TRANSACTION,
        confidence: 0.8,
        source: 'rule',
      };

    if (SOFT_OOS_RE.test(norm))
      return {
        intent: AiIntent.OUT_OF_SCOPE,
        confidence: 0.85,
        source: 'rule',
      };
    if (ADVICE_RE.test(norm) || GREETING_RE.test(norm)) {
      return { intent: AiIntent.CHITCHAT, confidence: 0.85, source: 'rule' };
    }
    return { intent: AiIntent.INTENT_UNCLEAR, confidence: 0.5, source: 'rule' };
  }

  /** Người dùng đang xin lời khuyên (dùng để chọn nhóm câu "advice" thay vì chào hỏi). */
  isAdviceRequest(text: string): boolean {
    return ADVICE_RE.test(normalizeForMatch(text));
  }
}
