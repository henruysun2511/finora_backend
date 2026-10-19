import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty({ description: 'UUID bạn bè', example: '550e8400-e29b-41d4-a716-446655440000' })
  friendId: string;

  @ApiProperty({ description: 'Tên bạn bè', example: 'Nguyễn Văn A' })
  friendFullName: string;

  @ApiPropertyOptional({ description: 'Avatar bạn bè', example: 'https://...' })
  friendAvatar: string | null;

  @ApiProperty({ description: 'Nội dung tin nhắn cuối cùng', example: 'Chuyển cho mình 200k nhé!' })
  lastMessageContent: string;

  @ApiProperty({ description: 'UUID người gửi tin cuối', example: '550e8400-e29b-41d4-a716-446655440000' })
  lastMessageSenderId: string;

  @ApiProperty({ description: 'Thời gian tin nhắn cuối', example: '2026-10-19T10:00:00.000Z' })
  lastMessageAt: Date;

  @ApiProperty({ description: 'Số tin nhắn chưa đọc', example: 3 })
  unreadCount: number;
}
