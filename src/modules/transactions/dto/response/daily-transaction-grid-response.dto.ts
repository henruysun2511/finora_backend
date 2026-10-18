import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

export class DailyGridPeriodDto {
  @ApiPropertyOptional({ description: 'Tháng lọc', example: 10 })
  month?: number;

  @ApiPropertyOptional({ description: 'Năm lọc', example: 2026 })
  year?: number;

  @ApiProperty({ description: 'Ngày bắt đầu tính toán (ISO string)', example: '2026-10-01T00:00:00.000Z' })
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc tính toán (ISO string)', example: '2026-10-31T23:59:59.999Z' })
  endDate: string;
}

export class DailyGridSummaryDto {
  @ApiProperty({ description: 'Tổng tiền thu nhập trong kỳ', example: 25000000 })
  totalIncome: number;

  @ApiProperty({ description: 'Tổng tiền chi tiêu trong kỳ', example: 12450000 })
  totalExpense: number;

  @ApiProperty({ description: 'Số dư ròng (totalIncome - totalExpense)', example: 12550000 })
  netAmount: number;

  @ApiProperty({ description: 'Tổng số lượng giao dịch trong kỳ', example: 18 })
  totalTransactions: number;
}

export class DailyTransactionGroupDto {
  @ApiProperty({ description: 'Ngày giao dịch (YYYY-MM-DD)', example: '2026-10-18' })
  date: string;

  @ApiProperty({ description: 'Thứ trong tuần (tiếng Anh hoặc tiếng Việt)', example: 'Sunday' })
  dayOfWeek: string;

  @ApiProperty({ description: 'Tổng thu trong ngày', example: 0 })
  totalIncome: number;

  @ApiProperty({ description: 'Tổng chi trong ngày', example: 210000 })
  totalExpense: number;

  @ApiProperty({ description: 'Số dư ròng trong ngày (totalIncome - totalExpense)', example: -210000 })
  netAmount: number;

  @ApiProperty({
    description: 'Danh sách giao dịch phát sinh trong ngày',
    type: [TransactionResponseDto],
  })
  transactions: TransactionResponseDto[];
}

export class DailyTransactionGridResponseDto {
  @ApiProperty({ description: 'Thông tin khoảng thời gian lọc', type: DailyGridPeriodDto })
  period: DailyGridPeriodDto;

  @ApiProperty({ description: 'Thống kê tổng hợp toàn kỳ', type: DailyGridSummaryDto })
  summary: DailyGridSummaryDto;

  @ApiProperty({
    description: 'Danh sách các ngày có giao dịch, gom nhóm theo từng ngày',
    type: [DailyTransactionGroupDto],
  })
  days: DailyTransactionGroupDto[];
}
