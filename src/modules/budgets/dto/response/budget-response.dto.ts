import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrencePeriod } from '../../../../common/enums/recurrence-period.enum';
import { BudgetPeriodResponseDto } from './budget-period-response.dto';

export class BudgetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  walletId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  category: { id: string; name: string; icon?: string; color?: string };

  @ApiProperty({ enum: RecurrencePeriod })
  period: RecurrencePeriod;

  @ApiProperty()
  limitAmount: number;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  isRollover: boolean;

  @ApiPropertyOptional({ type: BudgetPeriodResponseDto, nullable: true })
  currentPeriod: BudgetPeriodResponseDto | null;

  @ApiPropertyOptional({ type: [BudgetPeriodResponseDto] })
  periods?: BudgetPeriodResponseDto[];
}
