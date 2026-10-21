import { ApiProperty } from '@nestjs/swagger';

export class OverdueStatsDto {
  @ApiProperty({ example: 2 })
  overdueReceivableCount: number;

  @ApiProperty({ example: 4500000 })
  overdueReceivableAmount: number;

  @ApiProperty({ example: 1 })
  overduePayableCount: number;

  @ApiProperty({ example: 2000000 })
  overduePayableAmount: number;
}

export class TopDebtorItemDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  counterpartyName: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nullable: true })
  counterpartyUserId: string | null;

  @ApiProperty({ example: 'LENT', enum: ['LENT', 'BORROWED', 'INSTALLMENT'] })
  type: string;

  @ApiProperty({ example: 5000000 })
  remainingAmount: number;

  @ApiProperty({ example: '2026-10-15', nullable: true })
  dueDate: string | null;

  @ApiProperty({ example: true })
  isOverdue: boolean;

  @ApiProperty({ example: 6 })
  daysOverdue: number;
}

export class InstallmentItemDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  loanId: string;

  @ApiProperty({ example: 'Trả góp iPhone 15' })
  counterpartyName: string;

  @ApiProperty({ example: 24000000 })
  totalPrincipal: number;

  @ApiProperty({ example: 12000000 })
  paidAmount: number;

  @ApiProperty({ example: 12000000 })
  remainingAmount: number;

  @ApiProperty({ example: 50.0 })
  progressPercentage: number;

  @ApiProperty({ example: '2026-11-05', nullable: true })
  nextDueDate: string | null;
}

export class DebtsDashboardResponseDto {
  @ApiProperty({ example: 15000000 })
  totalReceivables: number;

  @ApiProperty({ example: 8000000 })
  totalPayables: number;

  @ApiProperty({ example: 7000000 })
  netDebtPosition: number;

  @ApiProperty({ example: 5.05 })
  debtToAssetRatio: number;

  @ApiProperty({ type: OverdueStatsDto })
  overdueStats: OverdueStatsDto;

  @ApiProperty({ type: [TopDebtorItemDto] })
  topDebtors: TopDebtorItemDto[];

  @ApiProperty({ type: [InstallmentItemDto] })
  installments: InstallmentItemDto[];
}
