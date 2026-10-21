import { ApiProperty } from '@nestjs/swagger';

export class AssetTierDto {
  @ApiProperty({ example: 'GOLD' })
  tier: string;

  @ApiProperty({ example: 'Nhà Tích Lũy Vàng' })
  title: string;

  @ApiProperty({ example: 'HAPPY' })
  mascotMood: string;

  @ApiProperty({ example: 200000000 })
  nextTierThreshold: number;
}

export class MonthlyCashflowDto {
  @ApiProperty({ example: '2026-10' })
  month: string;

  @ApiProperty({ example: 35000000 })
  income: number;

  @ApiProperty({ example: 18200000 })
  expense: number;

  @ApiProperty({ example: 16800000 })
  netCashflow: number;

  @ApiProperty({ example: 48.0 })
  savingsRate: number;

  @ApiProperty({ example: 12.5 })
  momIncomeChange: number;

  @ApiProperty({ example: -5.2 })
  momExpenseChange: number;
}

export class AccountSummaryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Vietcombank Priority' })
  name: string;

  @ApiProperty({ example: 'BANK' })
  type: string;

  @ApiProperty({ example: 120500000 })
  balance: number;

  @ApiProperty({ example: false })
  isExcludedFromNetWorth: boolean;
}

export class ActiveAlertDto {
  @ApiProperty({ example: 'BUDGET_WARNING', enum: ['BUDGET_WARNING', 'RECURRING_DUE_TODAY', 'OVERDUE_DEBT'] })
  type: string;

  @ApiProperty({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  severity: string;

  @ApiProperty({ example: "Danh mục 'Ăn uống' đã sử dụng 92% ngân sách tháng" })
  message: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  relatedEntityId: string;
}

export class RecentTransactionDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Cà phê sáng Highlands' })
  name: string;

  @ApiProperty({ example: 55000 })
  amount: number;

  @ApiProperty({ example: 'EXPENSE' })
  type: string;

  @ApiProperty({ example: 'Ăn uống' })
  categoryName: string;

  @ApiProperty({ example: '2026-10-21T08:30:00.000Z' })
  transactionDate: string;
}

export class OverviewDashboardResponseDto {
  @ApiProperty({ example: 158500000 })
  netWorth: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: AssetTierDto })
  assetTier: AssetTierDto;

  @ApiProperty({ type: MonthlyCashflowDto })
  monthlyCashflow: MonthlyCashflowDto;

  @ApiProperty({ type: [AccountSummaryDto] })
  accountsSummary: AccountSummaryDto[];

  @ApiProperty({ type: [ActiveAlertDto] })
  activeAlerts: ActiveAlertDto[];

  @ApiProperty({ type: [RecentTransactionDto] })
  recentTransactions: RecentTransactionDto[];
}