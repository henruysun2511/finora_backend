// src/modules/ai-chat/dto/request/chat-history-query.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryQueryDto {
  @ApiProperty({
    description: 'ID ví tiền cần lấy lịch sử trò chuyện',
    example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11',
  })
  @IsUUID(undefined, { message: 'walletId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'walletId không được để trống' })
  walletId: string;

  @ApiPropertyOptional({
    description: 'Số lượng tin nhắn muốn lấy (mặc định 20, tối đa 100)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lấy các tin nhắn trước ID này (phân trang dạng cursor)',
    example: '9b4f0d2f-7a7e-5b65-0c4a-3e7b1a1f9d22',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'beforeId phải là UUID hợp lệ' })
  beforeId?: string;
}
