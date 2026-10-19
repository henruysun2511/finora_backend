import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum RespondFriendRequestStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class RespondFriendRequestDto {
  @ApiProperty({
    enum: RespondFriendRequestStatus,
    example: RespondFriendRequestStatus.ACCEPTED,
    description: 'Hành động phản hồi lời mời: ACCEPTED (Đồng ý) hoặc REJECTED (Từ chối)',
  })
  @IsNotEmpty({ message: 'status không được để trống' })
  @IsEnum(RespondFriendRequestStatus, {
    message: 'status chỉ chấp nhận ACCEPTED hoặc REJECTED',
  })
  status: RespondFriendRequestStatus;
}
