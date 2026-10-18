import { ApiProperty } from '@nestjs/swagger';
import { FriendshipStatus } from '../../enums/friendship-status.enum';
export class FriendshipStatusResponseDto {
  @ApiProperty({ enum: FriendshipStatus, nullable: true, example: FriendshipStatus.ACCEPTED })
  status: FriendshipStatus | null;

  @ApiProperty({ example: true, description: 'True nếu người dùng hiện tại là người gửi lời mời' })
  isRequester: boolean;
}