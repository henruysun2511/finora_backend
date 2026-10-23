// src/modules/ai-chat/services/mascot-advice.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ADVICE_RULES, AdviceContext } from '../constants/advice-rules.constant';
import { pickRandom } from '../utils/text.util';

/**
 * Lời khuyên của mascot sau khi lưu giao dịch. Chạy SAU khi lưu thành công và KHÔNG bao giờ được làm hỏng luồng chính:
 * mọi lỗi đều được nuốt (trả null).
 */
@Injectable()
export class MascotAdviceService {
  private readonly logger = new Logger(MascotAdviceService.name);

  /** Mascot này có rule nào cần tổng thu/chi tháng không (để tránh truy vấn thừa). */
  needsMonthTotals(mascot: AdviceContext['mascot']): boolean {
    return ADVICE_RULES.some((r) => r.mascot === mascot && r.needsMonthTotals);
  }

  findAdvice(ctx: AdviceContext): { ruleId: string; message: string } | null {
    try {
      const rules = ADVICE_RULES.filter((r) => r.mascot === ctx.mascot).sort(
        (a, b) => b.priority - a.priority,
      );
      for (const rule of rules) {
        if (rule.when(ctx))
          return { ruleId: rule.id, message: pickRandom(rule.messages).value };
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `Lỗi kiểm tra rule lời khuyên: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
