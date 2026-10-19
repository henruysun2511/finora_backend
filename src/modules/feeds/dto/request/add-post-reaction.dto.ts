import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';

export class AddPostReactionDto {
  @ApiProperty({
    enum: ReactionEmoji,
    example: ReactionEmoji.LOVE,
    description: 'Biểu tượng cảm xúc (không phân biệt hoa/thường, VD: LOVE hoặc love)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsNotEmpty({ message: 'emoji không được để trống' })
  @IsEnum(ReactionEmoji, { message: 'emoji không hợp lệ' })
  emoji: ReactionEmoji;
}