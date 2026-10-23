import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringTransactionResponseDto } from './recurring-transaction-response.dto';

export class ExecutionHistoryItemDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  date: Date;
}

export class RecurringTransactionDetailResponseDto extends RecurringTransactionResponseDto {
  @ApiProperty({ example: 5 })
  totalExecutedTimes: number;

  @ApiProperty({ example: 1300000 })
  totalAmountSpent: number;

  @ApiProperty({ type: [ExecutionHistoryItemDto] })
  executionHistory: ExecutionHistoryItemDto[];
}
