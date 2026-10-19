import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty({ example: 'uuid-nguoi-dung' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  email: string;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/avatars/user.jpg' })
  avatar?: string | null;
}

export class PendingFriendRequestResponseDto {
  @ApiProperty({ example: 'uuid-ban-ghi-loi-moi' })
  id: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ example: 'received', enum: ['received', 'sent'] })
  type: 'received' | 'sent';

  @ApiProperty({ example: '2026-10-19T00:00:00.000Z' })
  createdAt: Date;
}
