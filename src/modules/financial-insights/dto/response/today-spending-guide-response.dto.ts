import { ApiProperty } from '@nestjs/swagger';
import { PacingSeverity, PacingStatus } from '../../financial-insights.constant';

export class TodaySpendingGuideResponseDto {
  @ApiProperty({ example: '2026-10-28' })
  date: string;

  @ApiProperty({ example: 13, description: 'Số ngày còn lại trong tháng' })
  daysRemaining: number;

  @ApiProperty({ example: 100000, description: 'Hạn mức chi tiêu an toàn của ngày hôm nay' })
  safeToSpendToday: number;

  @ApiProperty({ example: 45000, description: 'Số tiền đã chi tiêu trong hôm nay' })
  spentToday: number;

  @ApiProperty({ example: 55000, description: 'Số tiền còn lại được tiêu trong hôm nay' })
  remainingToday: number;

  @ApiProperty({ example: 1300000, description: 'Tổng ngân sách còn lại trong tháng' })
  remainingMonthBudget: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ enum: PacingStatus, example: PacingStatus.OVERPACING })
  pacingStatus: PacingStatus;

  @ApiProperty({ enum: PacingSeverity, example: PacingSeverity.WARNING })
  severity: PacingSeverity;

  @ApiProperty({
    example: 'Từ nay đến cuối tháng, mỗi ngày bạn chỉ nên tiêu tối đa 100.000₫ để không bị thâm hụt ngân sách!',
  })
  advice: string;

  @ApiProperty({
    example: 'Cuối tuần này thử chọn quán bình dân để không cháy túi nhé!',
    description: 'Lời khuyên chuyên sâu từ AI',
    nullable: true,
  })
  aiAdvice?: string | null;

  @ApiProperty({
    example: true,
    description: 'Đánh dấu lời khuyên có nguồn gốc từ AI hay từ Rule-based',
  })
  isAiGenerated: boolean;
}
