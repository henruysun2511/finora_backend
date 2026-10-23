import { ApiProperty } from '@nestjs/swagger';

export class SubCategoryBreakdownItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Cà phê & Trà sữa' })
  name: string;

  @ApiProperty({ example: 1200000 })
  amount: number;

  @ApiProperty({ example: 6.59 })
  percentage: number;
}

export class CategoryBreakdownItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Ăn uống' })
  name: string;

  @ApiProperty({ example: '🍜' })
  icon: string;

  @ApiProperty({ example: '#FF6B6B' })
  color: string;

  @ApiProperty({ example: 7200000 })
  amount: number;

  @ApiProperty({ example: 39.56 })
  percentage: number;

  @ApiProperty({ type: [SubCategoryBreakdownItemDto] })
  subCategories: SubCategoryBreakdownItemDto[];
}

export class TopSpendingItemDto {
  @ApiProperty({ example: 'Tiền thuê căn hộ tháng 10' })
  name: string;

  @ApiProperty({ example: 4800000 })
  amount: number;

  @ApiProperty({ example: 'Nhà ở & Điện nước' })
  categoryName: string;

  @ApiProperty({ example: '2026-10-05' })
  date: string;
}

export class Rule503020MetricDto {
  @ApiProperty({ example: 9500000 })
  amount: number;

  @ApiProperty({ example: 52.2 })
  percentage: number;

  @ApiProperty({ example: 50.0 })
  targetPercentage: number;

  @ApiProperty({ example: 'OPTIMAL', enum: ['OPTIMAL', 'SLIGHT_OVER', 'NEEDS_IMPROVEMENT'] })
  status: string;
}

export class Rule503020EvaluationDto {
  @ApiProperty({ type: Rule503020MetricDto })
  needs: Rule503020MetricDto;

  @ApiProperty({ type: Rule503020MetricDto })
  wants: Rule503020MetricDto;

  @ApiProperty({ type: Rule503020MetricDto })
  savings: Rule503020MetricDto;
}

export class CategoryBreakdownResponseDto {
  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 'EXPENSE', enum: ['EXPENSE', 'INCOME'] })
  type: string;

  @ApiProperty({ example: 18200000 })
  totalAmount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: Rule503020EvaluationDto, nullable: true })
  rule503020Evaluation: Rule503020EvaluationDto | null;

  @ApiProperty({ type: [CategoryBreakdownItemDto] })
  categories: CategoryBreakdownItemDto[];

  @ApiProperty({ type: [TopSpendingItemDto] })
  topSpendingItems: TopSpendingItemDto[];
}
