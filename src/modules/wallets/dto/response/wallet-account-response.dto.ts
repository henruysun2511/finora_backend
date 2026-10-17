import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '../../../accounts/enums/account-type.enum';

export class WalletAccountResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  walletId: string;

  @ApiProperty({ example: 'Vietcombank' })
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.BANK })
  type: AccountType;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ example: 15000000 })
  balance: number;

  @ApiPropertyOptional({ example: '💳' })
  icon?: string;

  @ApiPropertyOptional({ example: '#1E88E5' })
  color?: string;

  @ApiPropertyOptional({ example: '1234' })
  accountNumberLast4?: string;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ example: '2026-10-17T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-17T08:00:00.000Z' })
  updatedAt: Date;
}
