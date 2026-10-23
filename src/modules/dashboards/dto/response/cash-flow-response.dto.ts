import { ApiProperty } from '@nestjs/swagger';

export class CashFlowTimelineItemDto {
  @ApiProperty({ example: '2026-10-01' })
  dateLabel: string;

  @ApiProperty({ example: 15000000 })
  income: number;

  @ApiProperty({ example: 8200000 })
  expense: number;

  @ApiProperty({ example: 6800000 })
  net: number;
}

export class DayOfWeekHeatmapItemDto {
  @ApiProperty({ example: 'Thứ 7' })
  dayOfWeek: string;

  @ApiProperty({ example: 1250000 })
  averageExpense: number;
}

export class TimeOfDayDistributionItemDto {
  @ApiProperty({ example: 'Sáng (06h - 11h)' })
  label: string;

  @ApiProperty({ example: 2500000 })
  amount: number;

  @ApiProperty({ example: 18.5 })
  percentage: number;
}

export class TimeOfDayDistributionDto {
  @ApiProperty({ type: TimeOfDayDistributionItemDto })
  morning: TimeOfDayDistributionItemDto;

  @ApiProperty({ type: TimeOfDayDistributionItemDto })
  lunch: TimeOfDayDistributionItemDto;

  @ApiProperty({ type: TimeOfDayDistributionItemDto })
  afternoon: TimeOfDayDistributionItemDto;

  @ApiProperty({ type: TimeOfDayDistributionItemDto })
  evening: TimeOfDayDistributionItemDto;
}

export class CashFlowResponseDto {
  @ApiProperty({ example: 'MONTH' })
  period: string;

  @ApiProperty({ example: 35000000 })
  totalIncome: number;

  @ApiProperty({ example: 18200000 })
  totalExpense: number;

  @ApiProperty({ example: 16800000 })
  netSavings: number;

  @ApiProperty({ type: [CashFlowTimelineItemDto] })
  timeline: CashFlowTimelineItemDto[];

  @ApiProperty({ type: [DayOfWeekHeatmapItemDto] })
  dayOfWeekHeatmap: DayOfWeekHeatmapItemDto[];

  @ApiProperty({ type: TimeOfDayDistributionDto })
  timeOfDayDistribution: Record<string, TimeOfDayDistributionItemDto>;
}
