import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanType } from '../../enums/loan-type.enum';
import { LoanStatus } from '../../enums/loan-status.enum';
import { LoanInterestPeriod } from '../../enums/loan-interest-period.enum';

export class RecentPaymentDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' })
  id: string;

  @ApiProperty({ example: 2000000 })
  amount: number;

  @ApiProperty({ example: '2026-10-15T10:00:00.000Z' })
  paymentDate: string;

  @ApiProperty({ example: 'Vietcombank' })
  accountName: string;

  @ApiPropertyOptional({ example: 'Trả đợt 2', nullable: true })
  note?: string | null;
}

export class LoanDetailResponseDto {
  @ApiProperty({ example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  walletId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  accountId: string;

  @ApiProperty({ example: 'Vietcombank' })
  accountName: string;

  @ApiProperty({ enum: LoanType, example: LoanType.LENT })
  type: LoanType;

  @ApiProperty({ example: 'Anh Nam Đồng Nghiệp' })
  contactName: string;

  @ApiPropertyOptional({ example: '0912345678', nullable: true })
  contactInfo?: string | null;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    nullable: true,
  })
  counterpartyUserId?: string | null;

  @ApiProperty({ example: 10000000 })
  principalAmount: number;

  @ApiProperty({ example: 3000000 })
  remainingAmount: number;

  @ApiProperty({ example: 7000000 })
  paidAmount: number;

  @ApiProperty({ example: 70.0 })
  progressPercentage: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  loanDate: string;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z', nullable: true })
  dueDate?: string | null;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  status: LoanStatus;

  @ApiPropertyOptional({
    example: 'Cho vay tiền mua xe máy mới',
    nullable: true,
  })
  note?: string | null;

  @ApiProperty({ example: false })
  isInterestBearing: boolean;

  @ApiPropertyOptional({ example: 5.0, nullable: true })
  interestRate?: number | null;

  @ApiPropertyOptional({ enum: LoanInterestPeriod, nullable: true })
  interestPeriod?: LoanInterestPeriod | null;

  @ApiProperty({ example: true })
  affectsBalance: boolean;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-18T10:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: [RecentPaymentDto] })
  recentPayments: RecentPaymentDto[];
}
