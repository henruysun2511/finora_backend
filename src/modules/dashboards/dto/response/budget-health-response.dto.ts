import { ApiProperty } from '@nestjs/swagger';

export class BurnRateMetricsDto {
  @ApiProperty({ example: 450000 })
  actualDailyBurnRate: number;

  @ApiProperty({ example: 380000 })
  recommendedDailyBurnRate: number;

  @ApiProperty({ example: 14500000 })
  projectedMonthEndExpense: number;

  @ApiProperty({ example: '2026-10-28', nullable: true })
  projectedRunwayDate: string | null;

  @ApiProperty({ example: false })
  willOverspend: boolean;

  @ApiProperty({ example: 0 })
  estimatedOverspendAmount: number;
}

export class CategoryBudgetProgressDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  budgetId: string;

  @ApiProperty({ example: 'Ăn uống' })
  categoryName: string;

  @ApiProperty({ example: '🍜' })
  icon: string;

  @ApiProperty({ example: 5000000 })
  limitAmount: number;

  @ApiProperty({ example: 4200000 })
  spentAmount: number;

  @ApiProperty({ example: 800000 })
  remainingAmount: number;

  @ApiProperty({ example: 84.0 })
  spentPercentage: number;

  @ApiProperty({ example: 'WARNING', enum: ['GOOD', 'WARNING', 'EXCEEDED'] })
  status: string;

  @ApiProperty({ example: 'ORANGE', enum: ['GREEN', 'ORANGE', 'RED'] })
  colorStatus: string;
}

export class BudgetHealthResponseDto {
  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 21 })
  daysPassed: number;

  @ApiProperty({ example: 10 })
  daysRemaining: number;

  @ApiProperty({ example: 15000000 })
  totalBudgetLimit: number;

  @ApiProperty({ example: 9800000 })
  totalSpent: number;

  @ApiProperty({ example: 5200000 })
  remainingBudget: number;

  @ApiProperty({ example: 65.3 })
  spentPercentage: number;

  @ApiProperty({ type: BurnRateMetricsDto })
  burnRateMetrics: BurnRateMetricsDto;

  @ApiProperty({ type: [CategoryBudgetProgressDto] })
  categoryBudgets: CategoryBudgetProgressDto[];
}
