// src/modules/exchange-rates/dto/response/exchange-rate-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ExchangeRateResponseDto {
  @ApiProperty({ example: 'VND', description: 'Mã tiền tệ gốc' })
  from: string;

  @ApiProperty({ example: 'USD', description: 'Mã tiền tệ đích' })
  to: string;

  @ApiProperty({ example: 0.000039, description: 'Tỷ giá: 1 đơn vị tiền gốc = rate đơn vị tiền đích' })
  rate: number;

  @ApiProperty({ example: 25450, description: 'Tỷ giá đảo chiều: 1 đơn vị tiền đích = inverseRate đơn vị tiền gốc' })
  inverseRate: number;

  @ApiProperty({ example: '2026-10-18T13:00:00.000Z', description: 'Thời điểm cập nhật tỷ giá' })
  updatedAt: Date;

  @ApiProperty({ example: 'live', enum: ['live', 'cache', 'fallback'], description: 'Nguồn tỷ giá' })
  source: 'live' | 'cache' | 'fallback';

  @ApiProperty({ example: false, description: 'Đánh dấu tỷ giá ước tính khi dùng fallback hoặc cache cũ' })
  isEstimated: boolean;
}

export class ConvertCurrencyResponseDto extends ExchangeRateResponseDto {
  @ApiProperty({ example: 500000, description: 'Số tiền gốc cần quy đổi' })
  amount: number;

  @ApiProperty({ example: 19.65, description: 'Số tiền quy đổi nhận được (đã làm tròn 2 chữ số thập phân)' })
  convertedAmount: number;
}
