import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';

export class ReactionSummaryDto {
  @ApiProperty({ example: 'like' })
  emoji: ReactionEmoji;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;
}

export class ReplySnippetDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Chuyển cho mình 200k nhé!' })
  content: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  senderId: string;
}

export class RelatedTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Ăn trưa bún bò' })
  name: string;

  @ApiPropertyOptional({ example: 'https://...' })
  photoUrl?: string | null;

  @ApiProperty({ example: '2026-10-19T10:00:00.000Z' })
  transactionDate: Date;
}

export class MessageResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  senderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  receiverId: string;

  @ApiProperty({ example: 'Chuyển cho mình 200k nhé!' })
  content: string;

  @ApiPropertyOptional({ type: ReplySnippetDto })
  replyToMessage?: ReplySnippetDto | null;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  relatedTransactionId?: string | null;

  @ApiPropertyOptional({ type: RelatedTransactionDto })
  relatedTransaction?: RelatedTransactionDto | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ type: [ReactionSummaryDto] })
  reactions: ReactionSummaryDto[];

  @ApiProperty({ example: '2026-10-19T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-19T10:00:00.000Z' })
  updatedAt: Date;
}
