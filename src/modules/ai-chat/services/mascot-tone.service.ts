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
          { mascot, action: key, text: userText },
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

  /** Kiểm tra đơn giản: độ dài hợp lý, không lặp từ bất thường, không ký tự lạ. */
  isQualityOk(text: string): boolean {
    if (!text) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 100) return false;
    if (/[\u0000-\u0008\uFFFD<>{}[\]]/.test(text)) return false;
    const freq = new Map<string, number>();
    for (const w of words.map((x) =>
      x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''),
    )) {
      if (!w || w.length < 2) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    return ![...freq.values()].some((c) => c > 3);
  }
}
