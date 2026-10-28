import { ApiProperty } from '@nestjs/swagger';
import { PacingSeverity, PacingStatus } from '../../financial-insights.constant';

export class SpendingTimelineDto {
  @ApiProperty({ example: '2026-10-01' })
  startDate: string;

  @ApiProperty({ example: '2026-10-31' })
  endDate: string;

  @ApiProperty({ example: 31 })
  totalDays: number;

  @ApiProperty({ example: 18 })
  daysPassed: number;

  @ApiProperty({ example: 13 })
  daysRemaining: number;

  @ApiProperty({ example: 58.06, description: 'Phần trăm thời gian đã trôi qua trong chu kỳ' })
  timeElapsedPercentage: number;
}

export class SpendingBudgetSummaryDto {
  @ApiProperty({ example: true })
  hasBudget: boolean;

  @ApiProperty({ example: 10000000, description: 'Hạn mức ngân sách tháng' })
  totalLimit: number;

  @ApiProperty({ example: 8700000, description: 'Tổng chi tiêu thực tế trong chu kỳ' })
  totalSpent: number;

  @ApiProperty({ example: 1300000, description: 'Số tiền còn lại được tiêu' })
  remainingAmount: number;

  @ApiProperty({ example: 87.0, description: 'Phần trăm ngân sách đã sử dụng' })
  spentPercentage: number;
}

export class DailyAllowanceDto {
  @ApiProperty({ example: 322580, description: 'Hạn mức bình quân ngày ban đầu (Limit / TotalDays)' })
  initialDailyBudget: number;

  @ApiProperty({ example: 483333, description: 'Trung bình thực tế đã tiêu mỗi ngày (Spent / DaysPassed)' })
  actualDailySpentAvg: number;

  @ApiProperty({ example: 100000, description: 'Số tiền gợi ý nên tiêu mỗi ngày từ nay đến cuối kỳ' })
  recommendedDailyLimit: number;

  @ApiProperty({ example: 45000, description: 'Số tiền đã chi tiêu trong ngày hôm nay' })
  spentToday: number;

  @ApiProperty({ example: 55000, description: 'Số tiền còn lại được tiêu trong ngày hôm nay' })
  remainingToday: number;
}

export class PacingMetricsDto {
  @ApiProperty({ enum: PacingStatus, example: PacingStatus.OVERPACING })
  status: PacingStatus;

  @ApiProperty({ example: 1.5, description: 'Hệ số tốc độ tiêu tiền (% chi tiêu / % thời gian)' })
  burnRateMultiplier: number;

  @ApiProperty({ example: 14983323, description: 'Dự báo tổng chi tiêu cuối tháng với tốc độ hiện tại' })
  projectedMonthEndExpense: number;

  @ApiProperty({ example: 4983323, description: 'Dự báo số tiền thâm hụt vượt ngân sách nếu không điều chỉnh' })
  estimatedOverspendAmount: number;
}

export class NaturalLanguageInsightDto {
  @ApiProperty({ enum: PacingSeverity, example: PacingSeverity.WARNING })
  severity: PacingSeverity;

  @ApiProperty({ example: 'Tiêu nhanh hơn dự kiến ⚠️' })
  badge: string;

  @ApiProperty({ example: 'Bạn còn 13 ngày nữa là hết tháng.' })
  headline: string;

  @ApiProperty({ example: 'Số tiền còn lại được tiêu: 1.300.000₫.' })
  subheadline: string;

  @ApiProperty({
    example: 'Từ nay đến cuối tháng, mỗi ngày bạn chỉ nên tiêu tối đa 100.000₫ để không bị thâm hụt ngân sách!',
  })
  advice: string;

  @ApiProperty({
    example: 'Cuối tuần này thử chọn quán bình dân để không cháy túi nhé!',
    description: 'Lời khuyên chuyên sâu được cá nhân hóa bởi AI',
    nullable: true,
  })
  aiAdvice?: string | null;

  @ApiProperty({
    example: true,
    description: 'Đánh dấu lời khuyên có nguồn gốc được cá nhân hóa bởi AI hay không',
  })
  isAiGenerated: boolean;
}

export type SpendingInsightDto = NaturalLanguageInsightDto;
export const SpendingInsightDto = NaturalLanguageInsightDto;

export class SpendingPaceResponseDto {
  @ApiProperty({ example: 'b18b6241-1111-4562-b3fc-2c963f66afa6', nullable: true })
  walletId: string | null;

  @ApiProperty({ example: 'Ví Chi tiêu Cá nhân' })
  walletName: string;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: SpendingTimelineDto })
  timeline: SpendingTimelineDto;

  @ApiProperty({ type: SpendingBudgetSummaryDto })
  budget: SpendingBudgetSummaryDto;

  @ApiProperty({ type: DailyAllowanceDto })
  dailyAllowance: DailyAllowanceDto;

  @ApiProperty({ type: PacingMetricsDto })
  pacing: PacingMetricsDto;

  @ApiProperty({ type: NaturalLanguageInsightDto })
  insight: NaturalLanguageInsightDto;
}
