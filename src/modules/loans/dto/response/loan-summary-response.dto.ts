import { ApiProperty } from '@nestjs/swagger';

export class LoanSummaryResponseDto {
  @ApiProperty({
    description: 'Tổng tiền cần thu về (LENT còn nợ)',
    example: 15000000,
  })
  totalLent: number;

  @ApiProperty({
    description: 'Tổng tiền phải trả (BORROWED + INSTALLMENT còn nợ)',
    example: 4500000,
  })
  totalBorrowed: number;

  @ApiProperty({
    description: 'Số dư ròng (totalLent - totalBorrowed)',
    example: 10500000,
  })
  netBalance: number;

  @ApiProperty({
    description: 'Số khoản nợ quá hạn',
    example: 1,
  })
  overdueCount: number;

  @ApiProperty({
    description: 'Số khoản nợ đang hoạt động',
    example: 3,
  })
  activeCount: number;

  @ApiProperty({
    description: 'Đơn vị tiền tệ',
    example: 'VND',
  })
  currency: string;
}
