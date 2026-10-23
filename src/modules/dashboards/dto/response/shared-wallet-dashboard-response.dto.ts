import { ApiProperty } from '@nestjs/swagger';

export class MemberContributionDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId: string;

  @ApiProperty({ example: 'Nguyễn Văn Minh' })
  fullName: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/finora/image/upload/avatar.jpg', nullable: true })
  avatar: string | null;

  @ApiProperty({ example: 4500000 })
  totalPaid: number;

  @ApiProperty({ example: 60.0 })
  percentage: number;
}

export class SuggestedSettlementDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  fromUserId: string;

  @ApiProperty({ example: 'Trần Thị Mai' })
  fromUserName: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa7' })
  toUserId: string;

  @ApiProperty({ example: 'Nguyễn Văn Minh' })
  toUserName: string;

  @ApiProperty({ example: 750000 })
  amount: number;

  @ApiProperty({ example: 'Cân bằng chi phí ví chung theo phần đóng góp bình quân' })
  reason: string;
}

export class SettlementMatrixDto {
  @ApiProperty({ example: false })
  isBalanced: boolean;

  @ApiProperty({ type: [SuggestedSettlementDto] })
  suggestedSettlements: SuggestedSettlementDto[];
}

export class SharedWalletDashboardResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  walletId: string;

  @ApiProperty({ example: 'Ví Gia Đình' })
  walletName: string;

  @ApiProperty({ example: 7500000 })
  totalSpent: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: [MemberContributionDto] })
  memberContributions: MemberContributionDto[];

  @ApiProperty({ type: SettlementMatrixDto })
  settlementMatrix: SettlementMatrixDto;
}
