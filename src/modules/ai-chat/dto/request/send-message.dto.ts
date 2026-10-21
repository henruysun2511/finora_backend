// src/modules/ai-chat/dto/request/send-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionSource } from '../../../transactions/enums/transaction-source.enum';
import { AI_CHAT_CONFIG } from '../../ai-chat.constant';

export class SendMessageDto {
  @ApiProperty({
    description: 'ID của ví tiền đang hội thoại',
    example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11',
  })
  @IsUUID(undefined, { message: 'walletId phải là định dạng UUID hợp lệ' })
  @IsNotEmpty({ message: 'walletId không được để trống' })
  walletId: string;

  @ApiProperty({
    description: 'Nội dung tin nhắn người dùng gửi (text, hoặc text sau khi STT/OCR)',
    example: 'Hôm nay ăn sáng phở bò 45k trả bằng tiền mặt',
  })
  @IsString({ message: 'message phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(AI_CHAT_CONFIG.MAX_MESSAGE_LENGTH, {
    message: `Nội dung tin nhắn tối đa ${AI_CHAT_CONFIG.MAX_MESSAGE_LENGTH} ký tự`,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;

  @ApiPropertyOptional({
    enum: TransactionSource,
    example: TransactionSource.CHAT_TEXT,
    description: 'Kênh nhập liệu (CHAT_TEXT, VOICE, RECEIPT_SCAN)',
    default: TransactionSource.CHAT_TEXT,
  })
  @IsOptional()
  @IsEnum(TransactionSource, { message: 'source không hợp lệ' })
  source?: TransactionSource = TransactionSource.CHAT_TEXT;
}
