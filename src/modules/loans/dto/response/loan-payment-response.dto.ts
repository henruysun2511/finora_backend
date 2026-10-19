import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoanPaymentResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' })
  id: string;

  @ApiProperty({ example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001' })
  loanId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  accountId: string;

  @ApiProperty({ example: 'Vietcombank' })
  accountName: string;

  @ApiPropertyOptional({ example: 'bank', nullable: true })
  accountIcon?: string | null;

  @ApiProperty({ example: 2000000 })
  amount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ example: '2026-10-15T10:00:00.000Z' })
  paymentDate: string;

  @ApiProperty({ example: true })
  affectsBalance: boolean;

  @ApiPropertyOptional({ example: 'Trả đợt 2', nullable: true })
  note?: string | null;

  @ApiProperty({ example: '2026-10-15T10:00:00.000Z' })
  createdAt: string;
}
