import { ApiProperty } from '@nestjs/swagger';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../../../common/enums/wallet-member-role.enum';

export class WalletMemberInviteResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  walletId: string;

  @ApiProperty({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  userId: string;

  @ApiProperty({ enum: WalletMemberRole, example: WalletMemberRole.EDITOR })
  role: WalletMemberRole;

  @ApiProperty({ enum: WalletMemberStatus, example: WalletMemberStatus.PENDING })
  status: WalletMemberStatus;

  @ApiProperty({ example: '2026-10-19T08:30:00.000Z' })
  createdAt: Date;
}
