// src/modules/transfers/dto/response/convert-preview-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ConvertPreviewResponseDto {
  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11' })
  fromAccountId: string;

  @ApiProperty({ example: 'Vietcombank VND' })
  fromAccountName: string;

  @ApiProperty({ example: 'VND' })
  fromCurrency: string;

  @ApiProperty({ example: 1000000, description: 'Số tiền chuyển từ tài khoản nguồn' })
  fromAmount: number;

  @ApiProperty({ example: '9b4f0d2f-7a7e-5b65-0c4a-3e7b1a1f9d22' })
  toAccountId: string;

  @ApiProperty({ example: 'Chase Bank USD' })
  toAccountName: string;

  @ApiProperty({ example: 'USD' })
  toCurrency: string;

  @ApiProperty({ example: 39.29, description: 'Số tiền ước tính nhận được ở tài khoản đích' })
  toAmount: number;

  @ApiProperty({ example: 0.00003929, description: 'Tỷ giá quy đổi (1 đơn vị nguồn = rate đơn vị đích)' })
  exchangeRate: number;

  @ApiProperty({ example: 25450, description: 'Tỷ giá đảo chiều (1 đơn vị đích = inverseRate đơn vị nguồn)' })
  inverseRate: number;

  @ApiProperty({ example: false, description: 'true nếu dùng tỷ giá ước tính/fallback' })
  isEstimated: boolean;

  @ApiProperty({ example: 'live', enum: ['live', 'cache', 'fallback'] })
  rateSource: 'live' | 'cache' | 'fallback';
}
