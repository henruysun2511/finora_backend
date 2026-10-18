import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FriendResponseDto {
  @ApiProperty({ example: 'uuid-cua-ban-be' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  email: string;

  @ApiPropertyOptional({ example: 'https://www.pinterest.com/minhanh_ptbk/avt-m%E1%BA%B7c-%C4%91%E1%BB%8Bnh-fb/' })
  avatar?: string;

  @ApiProperty({ example: '2026-10-19T00:00:00.000Z' })
  connectedAt: Date;
}