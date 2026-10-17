import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  walletId: string;

  @ApiProperty({ example: 'Chi tiêu sinh hoạt' })
  walletName: string;

  @ApiProperty({ example: 'VND' })
  defaultCurrency: string;

  @ApiProperty({
    example: 25000000,
    description: 'Tổng số dư các tài khoản quy theo tiền tệ mặc định của ví',
  })
  totalBalance: number;

  @ApiProperty({
    example: { VND: 20000000, USD: 200 },
    description: 'Chi tiết số dư theo từng loại tiền tệ',
  })
  breakdownByCurrency: Record<string, number>;

  @ApiProperty({
    example: 3,
    description: 'Tổng số tài khoản đang hoạt động trong ví',
  })
  accountsCount: number;
}
