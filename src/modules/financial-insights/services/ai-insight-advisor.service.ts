import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../../ai-chat/services/model-gateway.service';
import { PacingStatus } from '../financial-insights.constant';

export interface AiInsightContext {
  userId: string;
  walletId?: string | null;
  walletName?: string;
  currency: string;
  date: string;
  totalDays: number;
  daysPassed: number;
  daysRemaining: number;
  formattedLimit: string;
  formattedSpent: string;
  formattedRemaining: string;
  formattedDailyLimit: string;
  formattedSpentToday: string;
  spentPercentage: number;
  pacingStatus: PacingStatus;
}

interface CachedAdvice {
  advice: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 giờ

@Injectable()
export class AiInsightAdvisorService {
  private readonly logger = new Logger(AiInsightAdvisorService.name);
  private readonly adviceCache = new Map<string, CachedAdvice>();

  constructor(private readonly modelGateway: ModelGatewayService) { }

  /**
   * Sinh lời khuyên tài chính cá nhân hóa từ AI Model (Gemini / FastAPI LLM).
   * Có cơ chế Cache tự động theo ngày & Fallback an toàn (trả về null nếu AI timeout/lỗi).
   */
  async generateAiAdvice(
    ctx: AiInsightContext,
    forceRefresh = false,
  ): Promise<string | null> {
    const cacheKey = `${ctx.userId}:${ctx.walletId || 'all'}:${ctx.date}`;

    // 1. Kiểm tra cache
    if (!forceRefresh) {
      const cached = this.adviceCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.advice;
      }
    }

    // 2. Kiểm tra tính sẵn sàng của AI Gateway
    if (!this.modelGateway.isAvailable()) {
      return null;
    }

    // 3. Xây dựng prompt chuyên sâu
    const prompt = this.buildPrompt(ctx);

    try {
      const raw = await this.modelGateway.postJson<{
        text?: string;
        output?: string;
        response?: string;
      }>(
        '/generate',
        {
          mascot: 'nora',
          action: 'spending_insight',
          text: prompt,
        },
        { timeoutMs: 4000 },
      );

      const generatedText = String(
        raw?.text ?? raw?.output ?? raw?.response ?? '',
      ).trim();

      if (this.isValidAdvice(generatedText)) {
        const cleanedAdvice = this.cleanAdvice(generatedText);
        // Lưu vào cache
        this.adviceCache.set(cacheKey, {
          advice: cleanedAdvice,
          cachedAt: Date.now(),
        });
        return cleanedAdvice;
      }

      return null;
    } catch (err: any) {
      this.logger.warn(`AI Insight generation không khả dụng: ${err.message}`);
      return null;
    }
  }

  /**
   * Xóa cache của một người dùng khi người dùng chủ động yêu cầu làm mới
   */
  clearCache(userId: string, walletId?: string): void {
    for (const key of this.adviceCache.keys()) {
      if (key.startsWith(`${userId}:${walletId || ''}`)) {
        this.adviceCache.delete(key);
      }
    }
  }

  private buildPrompt(ctx: AiInsightContext): string {
    return [
      `Bạn là trợ lý tài chính thông minh FINORA (thân thiện, hữu ích, thực tế).`,
      `Dưới đây là tiến độ chi tiêu của người dùng trong tháng:`,
      `- Ví: ${ctx.walletName || 'Tổng hợp các ví'}.`,
      `- Chu kỳ tháng: ${ctx.totalDays} ngày (đã qua ${ctx.daysPassed} ngày, còn lại ${ctx.daysRemaining} ngày).`,
      `- Ngân sách: ${ctx.formattedLimit}. Đã chi tiêu: ${ctx.formattedSpent} (${ctx.spentPercentage}%).`,
      `- Số tiền còn lại được tiêu: ${ctx.formattedRemaining}.`,
      `- Hạn mức gợi ý mỗi ngày: ${ctx.formattedDailyLimit}/ngày.`,
      `- Hôm nay đã tiêu: ${ctx.formattedSpentToday}.`,
      `- Đánh giá tốc độ chi tiêu: ${ctx.pacingStatus}.`,
      `Yêu cầu:`,
      `Hãy đưa ra đúng 1 lời khuyên tài chính ngắn gọn (tối đa 2 câu, dưới 45 từ).`,
      `Lời khuyên phải mang tính hành động cụ thể, gần gũi, khích lệ hoặc nhắc nhở tinh tế phù hợp với tình hình số dư. Không thêm câu chào hỏi rườm rà.`,
    ].join('\n');
  }

  private isValidAdvice(text: string): boolean {
    return text.length >= 10 && text.length <= 300;
  }

  private cleanAdvice(text: string): string {
    return text.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  }
}
