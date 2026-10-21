import { ApiProperty } from '@nestjs/swagger';

class AssetTierDto {
  @ApiProperty({ example: 'GOLD' }) tier: string;
  @ApiProperty({ example: 'Nhà Tích Lũy Vàng' }) title: string;
  @ApiProperty({ example: 'HAPPY' }) mascotMood: string;
  @ApiProperty({ example: 200000000 }) nextTierThreshold: number;
}

class MonthlyCashflowDto {
  @ApiProperty({ example: '2026-10' }) month: string;
  @ApiProperty({ example: 35000000 }) income: number;
  @ApiProperty({ example: 18200000 }) expense: number;
  @ApiProperty({ example: 16800000 }) netCashflow: number;
  @ApiProperty({ example: 48.0 }) savingsRate: number;
  @ApiProperty({ example: 12.5 }) momIncomeChange: number;
  @ApiProperty({ example: -5.2 }) momExpenseChange: number;
}

export class OverviewDashboardResponseDto {
  @ApiProperty({ example: 158500000 }) netWorth: number;
  @ApiProperty({ example: 'VND' }) currency: string;
  @ApiProperty({ type: AssetTierDto }) assetTier: AssetTierDto;
  @ApiProperty({ type: MonthlyCashflowDto }) monthlyCashflow: MonthlyCashflowDto;
  @ApiProperty({ type: [Object], example: [] }) accountsSummary: any[];
  @ApiProperty({ type: [Object], example: [] }) activeAlerts: any[];
  @ApiProperty({ type: [Object], example: [] }) recentTransactions: any[];
}