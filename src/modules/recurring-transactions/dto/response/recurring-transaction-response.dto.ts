import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrencePeriod } from '../../enums/recurrence-period.enum';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class CategoryBriefResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  icon?: string;
}

export class RecurringTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: RecurrencePeriod })
  frequency: RecurrencePeriod;

  @ApiPropertyOptional()
  accountName?: string;

  @ApiPropertyOptional({ type: CategoryBriefResponseDto })
  category?: CategoryBriefResponseDto;

  @ApiProperty()
  nextRunDate: Date;

  @ApiPropertyOptional({ nullable: true })
  endDate?: Date | null;

  @ApiProperty()
  isPaused: boolean;

  @ApiProperty()
  createdAt: Date;
}