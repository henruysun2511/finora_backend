// src/modules/transfers/dto/response/transfer-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferAccountSummaryDto {
  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11' })
  id: string;

  @ApiProperty({ example: 'Vietcombank' })
  name: string;

  @ApiProperty({ example: 'VND' })
  currency: string;
}

export class TransferResponseDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11' })
  fromAccountId: string;

  @ApiPropertyOptional({ type: () => TransferAccountSummaryDto })
  fromAccount?: TransferAccountSummaryDto;

  @ApiProperty({ example: '9b4f0d2f-7a7e-5b65-0c4a-3e7b1a1f9d22' })
  toAccountId: string;

  @ApiPropertyOptional({ type: () => TransferAccountSummaryDto })
  toAccount?: TransferAccountSummaryDto;

  @ApiProperty({ example: 1000000, description: 'Số tiền chuyển từ tài khoản nguồn' })
  fromAmount: number;

  @ApiProperty({ example: 'VND' })
  fromCurrency: string;

  @ApiProperty({ example: 39.29, description: 'Số tiền nhận được ở tài khoản đích' })
  toAmount: number;

  @ApiProperty({ example: 'USD' })
  toCurrency: string;

  @ApiProperty({ example: 0.00003929, description: 'Tỷ giá áp dụng tại thời điểm chuyển' })
  exchangeRate: number;

  @ApiProperty({ example: 0, description: 'Phí chuyển tiền' })
  fee: number;

  @ApiPropertyOptional({ example: null, description: 'ID tài khoản trích tiền phí' })
  feeAccountId?: string | null;

  @ApiPropertyOptional({ example: 'Chuyển tiền mua sắm', description: 'Ghi chú' })
  note?: string | null;

  @ApiProperty({ example: '2026-10-18T10:00:00Z', description: 'Ngày giao dịch' })
  transferDate: Date;

  @ApiProperty({ example: '2026-10-18T10:00:00Z', description: 'Thời điểm tạo bản ghi' })
  createdAt: Date;
}
