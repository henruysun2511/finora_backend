import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({ description: 'UUID người nhận', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'receiverId phải là UUID v4' })
  @IsNotEmpty({ message: 'receiverId không được để trống' })
  receiverId: string;

  @ApiProperty({ description: 'Nội dung tin nhắn', example: 'Chuyển cho mình 200k nhé!' })
  @IsString({ message: 'content phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(2000, { message: 'Nội dung tin nhắn tối đa 2000 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;

  @ApiPropertyOptional({ description: 'UUID tin nhắn đang trả lời (Quote Reply)' })
  @IsOptional()
  @IsUUID('4', { message: 'replyToMessageId phải là UUID v4' })
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'UUID giao dịch đính kèm (Story Reply)' })
  @IsOptional()
  @IsUUID('4', { message: 'relatedTransactionId phải là UUID v4' })
  relatedTransactionId?: string;
}
