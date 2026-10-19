import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FriendRelationStatus } from '../../enums/friend-relation-status.enum';

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
    enum: FriendRelationStatus,
    example: FriendRelationStatus.NONE,
    description: 'Trạng thái quan hệ với người dùng đang đăng nhập',
  })
  relationStatus: FriendRelationStatus;
}
