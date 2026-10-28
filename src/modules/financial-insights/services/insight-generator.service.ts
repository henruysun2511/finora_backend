import { Injectable } from '@nestjs/common';
import {
  PACING_THRESHOLDS,
  PacingSeverity,
  PacingStatus,
} from '../financial-insights.constant';
import { NaturalLanguageInsightDto } from '../dto/response/spending-pace-response.dto';

@Injectable()
export class InsightGeneratorService {
  /**
   * Định dạng tiền tệ hiển thị thân thiện (VD: 1.300.000₫)
   */
  formatCurrency(amount: number, currency = 'VND'): string {
    const rounded = Math.round(amount);
    const formatted = rounded.toLocaleString('vi-VN');
    return currency === 'VND' ? `${formatted}₫` : `${formatted} ${currency}`;
  }

  /**
   * Đánh giá trạng thái Pacing (Tốc độ chi tiêu so với tiến độ thời gian)
   */
  evaluatePacingStatus(params: {
    hasBudget: boolean;
    remainingAmount: number;
    burnRateMultiplier: number;
  }): PacingStatus {
    const { hasBudget, remainingAmount, burnRateMultiplier } = params;

    if (!hasBudget) {
      return PacingStatus.NO_BUDGET;
    }

    if (remainingAmount <= 0) {
      return PacingStatus.EXCEEDED;
    }

    if (burnRateMultiplier > PACING_THRESHOLDS.ON_TRACK_RATIO) {
      return PacingStatus.OVERPACING;
    }

    if (burnRateMultiplier <= PACING_THRESHOLDS.EXCELLENT_RATIO) {
      return PacingStatus.EXCELLENT;
    }

    return PacingStatus.ON_TRACK;
  }

  /**
   * Sinh lời khuyên tài chính bằng ngôn ngữ tự nhiên (Natural Language Advice)
   */
  generateInsight(params: {
    daysRemaining: number;
    remainingAmount: number;
    recommendedDailyLimit: number;
    spentToday: number;
    hasBudget: boolean;
    currency: string;
    pacingStatus: PacingStatus;
    totalLimit: number;
  }): NaturalLanguageInsightDto {
    const {
      daysRemaining,
      remainingAmount,
      recommendedDailyLimit,
      spentToday,
      hasBudget,
      currency,
      pacingStatus,
    } = params;

    const formattedRemaining = this.formatCurrency(remainingAmount, currency);
    const formattedDaily = this.formatCurrency(recommendedDailyLimit, currency);
    const formattedSpentToday = this.formatCurrency(spentToday, currency);

    // Trường hợp 1: Không có ngân sách
    if (!hasBudget || pacingStatus === PacingStatus.NO_BUDGET) {
      return {
        severity: PacingSeverity.INFO,
        badge: 'Chưa đặt ngân sách 💡',
        headline: `Bạn còn ${daysRemaining} ngày nữa là hết tháng.`,
        subheadline: `Hôm nay bạn đã chi tiêu ${formattedSpentToday}.`,
        advice:
          'Hãy thiết lập ngân sách tháng cho ví để FINORA giúp bạn kiểm soát tiến độ và gợi ý hạn mức mỗi ngày!',
        aiAdvice: null,
        isAiGenerated: false,
      };
    }

    // Trường hợp 2: Đã vượt/cạn ngân sách (remainingAmount <= 0)
    if (pacingStatus === PacingStatus.EXCEEDED) {
      const overspendAmount = Math.abs(remainingAmount);
      const formattedOverspend = this.formatCurrency(overspendAmount, currency);

      return {
        severity: PacingSeverity.DANGER,
        badge: 'Thâm hụt ngân sách 🚨',
        headline: `Bạn còn ${daysRemaining} ngày nữa là hết tháng.`,
        subheadline: `Ngân sách đã bị vượt mức: ${formattedOverspend}.`,
        advice: `Bạn đã chi tiêu vượt ngân sách tháng này! Hãy hạn chế tối đa các khoản chi phát sinh không thiết yếu trong ${daysRemaining} ngày còn lại.`,
        aiAdvice: null,
        isAiGenerated: false,
      };
    }

    // Trường hợp 3: Ngày cuối cùng của kỳ/tháng
    if (daysRemaining <= 1) {
      return {
        severity: PacingSeverity.SUCCESS,
        badge: 'Ngày cuối tháng 🏁',
        headline: 'Hôm nay là ngày cuối cùng của chu kỳ ngân sách!',
        subheadline: `Số tiền còn lại của bạn: ${formattedRemaining}.`,
        advice: `Hôm nay bạn có thể chi tối đa ${formattedRemaining} mà không bị vượt ngân sách tháng này. Chúc mừng bạn đã hoàn thành kế hoạch chi tiêu!`,
        aiAdvice: null,
        isAiGenerated: false,
      };
    }

    // Trường hợp 4: Tiêu quá nhanh (Overpacing)
    if (pacingStatus === PacingStatus.OVERPACING) {
      return {
        severity: PacingSeverity.WARNING,
        badge: 'Tiêu nhanh hơn dự kiến ⚠️',
        headline: `Bạn còn ${daysRemaining} ngày nữa là hết tháng.`,
        subheadline: `Số tiền còn lại được tiêu: ${formattedRemaining}.`,
        advice: `Từ nay đến cuối tháng, mỗi ngày bạn chỉ nên tiêu tối đa ${formattedDaily} để không bị thâm hụt ngân sách!`,
        aiAdvice: null,
        isAiGenerated: false,
      };
    }

    // Trường hợp 5: Tiết kiệm rất tốt (Excellent)
    if (pacingStatus === PacingStatus.EXCELLENT) {
      return {
        severity: PacingSeverity.SUCCESS,
        badge: 'Chi tiêu rất kỷ luật 🎯',
        headline: `Bạn còn ${daysRemaining} ngày nữa là hết tháng.`,
        subheadline: `Số tiền còn lại được tiêu: ${formattedRemaining}.`,
        advice: `Tuyệt vời! Bạn đang kiểm soát rất tốt. Mỗi ngày bạn có thể thoải mái chi tiêu tối đa ${formattedDaily} mà vẫn hoàn thành mục tiêu tiết kiệm.`,
        aiAdvice: null,
        isAiGenerated: false,
      };
    }

    // Trường hợp 6: Đúng tiến độ (On track)
    return {
      severity: PacingSeverity.INFO,
      badge: 'Đúng tiến độ 👍',
      headline: `Bạn còn ${daysRemaining} ngày nữa là hết tháng.`,
      subheadline: `Số tiền còn lại được tiêu: ${formattedRemaining}.`,
      advice: `Tiến độ chi tiêu đang ổn định. Hãy duy trì mức chi tiêu trung bình dưới ${formattedDaily}/ngày để cán đích an toàn!`,
      aiAdvice: null,
      isAiGenerated: false,
    };
  }
}
