import { ApiProperty } from '@nestjs/swagger';

export class BudgetPeriodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '2026-10-01' })
  startDate: string;

  @ApiProperty({ example: '2026-10-31' })
  endDate: string;

  @ApiProperty()
  limitAmount: number;

  @ApiProperty()
  spentAmount: number;

  @ApiProperty()
  rolloverAmount: number;

  @ApiProperty()
  effectiveLimit: number;

  @ApiProperty()
  remainingAmount: number;

  @ApiProperty()
  percentage: number;
}
