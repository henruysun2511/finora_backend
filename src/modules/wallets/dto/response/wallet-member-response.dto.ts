import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../../../common/enums/wallet-member-role.enum';

export class WalletMemberResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  userId: string;

  @ApiProperty({ example: 'Trần Văn Chủ' })
  fullName: string;

  @ApiProperty({ example: 'chu@gmail.com' })
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ enum: WalletMemberRole, example: WalletMemberRole.OWNER })
  role: WalletMemberRole;

  @ApiProperty({ enum: WalletMemberStatus, example: WalletMemberStatus.ACCEPTED })
  status: WalletMemberStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  joinedAt?: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;
}
