// src/modules/ai-chat/services/mascot-tone.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { getAiModelConfig } from '../../../config/ai-model.config';
import { MASCOT_VOICES, MascotVoice } from '../constants/mascot-templates.constant';
import { MascotCode } from '../interfaces/ai-chat.types';
import { fillTemplate, pickRandom } from '../utils/text.util';
import { ModelGatewayService } from './model-gateway.service';

type Vars = Record<string, string | number | null | undefined>;

/** Các nhóm câu mà model sinh văn bản (BARTpho/GPT2-vi) được phép sinh. Câu chứa số liệu LUÔN dùng template. */
const GENERATABLE: Array<keyof MascotVoice> = [
  'chitchat',
  'advice',
  'outOfScope',
  'unclear',
];

export interface FinancialContext {
  balance?: number;
  monthlyBudget?: number;
  monthlySpent?: number;
  totalDebt?: number;
  netWorth?: number;
}

/**
 * MascotToneService: toàn bộ "giọng điệu" của mascot.
 * - Template pool là nền tảng (luôn có, không bao giờ trả câu rỗng).
 * - Với chitchat/advice/outOfScope/unclear: nếu bật AI_TEXT_GEN_ENABLED thì thử model sinh văn bản,
 *   kiểm tra chất lượng, lỗi/không đạt -> rơi về template.
 */
@Injectable()
export class MascotToneService {
  private readonly logger = new Logger(MascotToneService.name);
  private readonly lastIndex = new Map<string, number>();

  constructor(private readonly gateway: ModelGatewayService) {}

  /** Lấy câu từ template pool (tránh lặp lại câu vừa dùng liền trước). */
  say(mascot: MascotCode, key: keyof MascotVoice, vars: Vars = {}): string {
    const voice = MASCOT_VOICES[mascot] ?? MASCOT_VOICES.nora;
    const pool = voice[key] as string[];
    const cacheKey = `${mascot}:${key}`;
    const { value, index } = pickRandom(pool, this.lastIndex.get(cacheKey));
    this.lastIndex.set(cacheKey, index);
    return fillTemplate(value, vars);
  }

  /** Trả lời cho nhóm câu "mềm" (có thể do model sinh) với fallback template bắt buộc. */
  async sayGenerated(
    mascot: MascotCode,
    key: keyof MascotVoice,
    userText: string,
    systemPrompt?: string,
    history?: Array<{ role: string; content: string }>,
    financialContext?: FinancialContext,
  ): Promise<string> {
    const cfg = getAiModelConfig();
    if (
      cfg.textGenEnabled &&
      GENERATABLE.includes(key) &&
      this.gateway.isAvailable()
    ) {
      try {
        const raw = await this.gateway.postJson<{
          text?: unknown;
          output?: unknown;
        }>(
          '/generate',
          {
            mascot,
            action: key,
            text: userText,
            system_prompt: systemPrompt,
            history: history && history.length > 0 ? history : undefined,
            user_balance: financialContext?.balance,
            monthly_budget: financialContext?.monthlyBudget,
            monthly_spent: financialContext?.monthlySpent,
            total_debt: financialContext?.totalDebt,
            net_worth: financialContext?.netWorth,
          },
          { timeoutMs: cfg.timeouts.generateMs },
        );
        const text = String(raw?.text ?? raw?.output ?? '').trim();
        if (this.isQualityOk(text)) return text;
        this.logger.warn(
          `Câu sinh ra không đạt chất lượng, dùng template: "${text.slice(0, 60)}"`,
        );
      } catch (err) {
        this.logger.warn(
          `Text generation lỗi, dùng template: ${(err as Error).message}`,
        );
      }
    }
    return this.say(mascot, key);
  }

  /**
   * Sinh lời nhận xét tài chính và lời khuyên dựa trên số liệu/biểu đồ thực tế qua AI model.
   * Nếu AI service offline hoặc lỗi -> tự động rơi về câu thoại fallback template an toàn.
   */
  async sayChartInsight(
    mascot: MascotCode,
    contextPrompt: string,
    fallbackText: string,
    systemPrompt?: string,
  ): Promise<string> {
    const cfg = getAiModelConfig();
    if (cfg.textGenEnabled && this.gateway.isAvailable()) {
      try {
        const raw = await this.gateway.postJson<{
          text?: unknown;
          output?: unknown;
        }>(
          '/generate',
          {
            mascot,
            action: 'spending_insight',
            text: contextPrompt,
            system_prompt: systemPrompt,
          },
          { timeoutMs: cfg.timeouts.generateMs },
        );
        const text = String(raw?.text ?? raw?.output ?? '').trim();
        if (this.isQualityOk(text)) return text;
        this.logger.warn(
          `Chart insight sinh ra không đạt chất lượng, dùng fallback: "${text.slice(0, 60)}"`,
        );
      } catch (err) {
        this.logger.warn(
          `Chart insight sinh text lỗi, dùng fallback: ${(err as Error).message}`,
        );
      }
    }
    return fallbackText;
  }

  /** Kiểm tra chất lượng: độ dài hợp lý, không dính vòng lặp suy biến (degenerate loop), không ký tự điều khiển lạ. */
  isQualityOk(text: string): boolean {
    if (!text) return false;
    const words = text.split(/\s+/).filter(Boolean);
    // Độ dài tối thiểu 3 từ, tối đa 1200 từ cho câu trả lời tư vấn sâu
    if (words.length < 3 || words.length > 1200) return false;

    // Chỉ chặn các ký tự điều khiển nhị phân thực sự, cho phép markdown [] {} <>
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(text)) return false;

    // Bắt vòng lặp từ liên tiếp suy biến (ví dụ: "tiền tiền tiền tiền")
    if (/(?:^|\s+)([\p{L}\p{N}]+)(?:\s+\1){3,}(?:\s+|$)/iu.test(text)) {
      return false;
    }

    // Với văn bản ngắn (< 25 từ), kiểm tra tần suất lặp đơn giản
    if (words.length < 25) {
      const freq = new Map<string, number>();
      for (const w of words.map((x) =>
        x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''),
      )) {
        if (!w || w.length < 2) continue;
        const count = (freq.get(w) ?? 0) + 1;
        if (count > 4) return false;
        freq.set(w, count);
      }
    } else {
      // Với văn bản dài, kiểm tra xem có một từ nào chiếm bất thường > 25% tổng số từ không
      const freq = new Map<string, number>();
      for (const w of words.map((x) =>
        x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''),
      )) {
        if (!w || w.length < 2) continue;
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
      const maxCount = Math.max(...freq.values());
      if (maxCount / words.length > 0.25) return false;
    }

    return true;
  }
}
