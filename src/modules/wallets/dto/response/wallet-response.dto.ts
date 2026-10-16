import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletMemberRole } from '../../../../common/enums/wallet-member-role.enum';

export class WalletResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Chi tiêu cá nhân' })
  name: string;

  @ApiPropertyOptional({ example: '💼' })
  icon?: string;

  @ApiPropertyOptional({ example: 'Ví quản lý chi tiêu sinh hoạt' })
  description?: string;

  @ApiProperty({ example: 'VND' })
  defaultCurrency: string;

  @ApiProperty({ example: false })
  isShared: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  ownerId: string;

  @ApiPropertyOptional({
    enum: WalletMemberRole,
    example: WalletMemberRole.OWNER,
    description: 'Vai trò của người dùng hiện tại trong ví này',
  })
  currentUserRole?: WalletMemberRole;

  @ApiProperty({ example: '2026-10-16T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-16T08:00:00.000Z' })
  updatedAt: Date;
}
