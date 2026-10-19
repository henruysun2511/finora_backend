import { ApiProperty } from '@nestjs/swagger';
import { RecurrencePeriod } from '../../../../common/enums/recurrence-period.enum';

export class BudgetStatusResponseDto {
  @ApiProperty()
  budgetId: string;

  @ApiProperty()
  category: { id: string; name: string; icon?: string; color?: string };

  @ApiProperty({ enum: RecurrencePeriod })
  period: RecurrencePeriod;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  daysRemaining: number;

  @ApiProperty()
  limitAmount: number;

  @ApiProperty()
  rolloverAmount: number;

  @ApiProperty()
  effectiveLimit: number;

  @ApiProperty()
  spentAmount: number;

  @ApiProperty()
  remainingAmount: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  dailyBudgetRemaining: number;

  @ApiProperty({ enum: ['SAFE', 'WARNING', 'EXCEEDED'] })
  alertStatus: 'SAFE' | 'WARNING' | 'EXCEEDED';
}
