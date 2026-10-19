import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FriendshipStatus } from '../../enums/friendship-status.enum';

export class UpdateFriendshipStatusDto {
  @ApiProperty({
    enum: [FriendshipStatus.BLOCKED],
    example: FriendshipStatus.BLOCKED,
    description: 'Trạng thái cần cập nhật (Hiện hỗ trợ BLOCKED)',
  })
  @IsNotEmpty({ message: 'status không được để trống' })
  @IsEnum([FriendshipStatus.BLOCKED], {
    message: 'status chỉ chấp nhận BLOCKED',
  })
  status: FriendshipStatus.BLOCKED;
}
