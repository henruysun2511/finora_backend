import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({ example: 'uuid-của-người-nhận' })
  @IsUUID()
  @IsNotEmpty()
  addresseeId: string;
}