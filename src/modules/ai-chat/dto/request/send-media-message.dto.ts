// src/modules/ai-chat/dto/request/send-media-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/** Body multipart/form-data của POST chat/messages/media (file nằm ở field "file"). */
export class SendMediaMessageDto {
  @ApiProperty({
    description: 'ID của ví tiền đang hội thoại',
    example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11',
  })
  @IsUUID(undefined, { message: 'walletId phải là định dạng UUID hợp lệ' })
  @IsNotEmpty({ message: 'walletId không được để trống' })
  walletId: string;
}
