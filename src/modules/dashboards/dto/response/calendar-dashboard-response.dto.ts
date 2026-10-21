import { ApiProperty } from '@nestjs/swagger';

export class CalendarDayItemDto {
  @ApiProperty({ example: '2026-10-21' })
  date: string;

  @ApiProperty({ example: 0 })
  totalIncome: number;

  @ApiProperty({ example: 250000 })
  totalExpense: number;

  @ApiProperty({ example: 3 })
  transactionCount: number;

  @ApiProperty({ example: false })
  hasSpikeExpense: boolean;

  @ApiProperty({ example: 'https://res.cloudinary.com/finora/image/upload/receipt.jpg', nullable: true })
  highlightPhotoUrl: string | null;
}

export class UpcomingBillItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Gói Netflix 4K' })
  name: string;

  @ApiProperty({ example: 260000 })
  amount: number;

  @ApiProperty({ example: '2026-10-25' })
  nextRunDate: string;

  @ApiProperty({ example: 'MONTHLY' })
  frequency: string;

  @ApiProperty({ example: 4 })
  daysRemaining: number;
}

export class UpcomingBillsSummaryDto {
  @ApiProperty({ example: 2450000 })
  totalUpcoming30Days: number;

  @ApiProperty({ example: 12500000 })
  projectedDisposableCash: number;

  @ApiProperty({ type: [UpcomingBillItemDto] })
  bills: UpcomingBillItemDto[];
}

export class CalendarDashboardResponseDto {
  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ type: [CalendarDayItemDto] })
  days: CalendarDayItemDto[];

  @ApiProperty({ type: UpcomingBillsSummaryDto })
  upcomingBillsSummary: UpcomingBillsSummaryDto;
}
