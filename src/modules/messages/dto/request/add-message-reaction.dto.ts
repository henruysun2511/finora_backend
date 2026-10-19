import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';

export class AddMessageReactionDto {
  @ApiProperty({
    description: 'Loại emoji cảm xúc',
    enum: ReactionEmoji,
    example: ReactionEmoji.LOVE,
  })
  @IsEnum(ReactionEmoji, { message: 'emoji không hợp lệ' })
  @IsNotEmpty({ message: 'emoji không được để trống' })
  emoji: ReactionEmoji;
}
