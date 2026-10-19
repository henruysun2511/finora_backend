import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';

export class PostReactionResponseDto {
  @ApiProperty({ example: 'u-an-uuid' })
  userId: string;

  @ApiProperty({ example: 'Nguyễn Thị An' })
  fullName: string;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/avatars/an.jpg', nullable: true })
  avatar?: string | null;

  @ApiProperty({ enum: ReactionEmoji, example: ReactionEmoji.LOVE })
  emoji: ReactionEmoji;

  @ApiProperty({ example: '2026-10-18T09:00:00.000Z' })
  createdAt: Date;
}

export class AddReactionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ enum: ReactionEmoji, example: ReactionEmoji.LOVE })
  emoji: ReactionEmoji;
}

export class RemoveReactionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Đã gỡ bỏ cảm xúc' })
  message: string;
}