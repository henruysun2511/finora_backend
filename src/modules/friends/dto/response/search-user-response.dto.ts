import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchUserResultDto {
  @ApiProperty({ example: 'uuid-nguoi-dung' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  email: string;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/avatars/user.jpg' })
  avatar?: string | null;

  @ApiProperty({
    example: 'NONE',
    enum: ['NONE', 'ACCEPTED', 'PENDING_SENT', 'PENDING_RECEIVED', 'BLOCKED'],
    description: 'Trạng thái quan hệ với người dùng đang đăng nhập',
  })
  relationStatus: string;
}
