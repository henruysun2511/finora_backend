import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiptResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  accountId: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/finora/image/upload/v1234/receipt1.jpg',
  })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Highlands Coffee' })
  merchantName?: string | null;

  @ApiProperty({ example: 85000 })
  totalAmount: number;

  @ApiPropertyOptional({ example: 8500 })
  taxAmount?: number | null;

  @ApiPropertyOptional({ example: 0 })
  tipAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Dữ liệu bóc tách thô từ OCR / AI',
    example: { merchant_name: 'Highlands Coffee', total_amount: 85000 },
  })
  ocrRawData?: Record<string, any> | null;

  @ApiProperty({ example: '2026-10-26T14:30:00.000Z' })
  scannedAt: Date;

  @ApiProperty({ example: '2026-10-26T14:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-26T14:30:00.000Z' })
  updatedAt: Date;
}
