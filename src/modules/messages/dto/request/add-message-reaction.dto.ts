import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';

export class AddMessageReactionDto {
  @ApiProperty({
    description: 'Loại emoji cảm xúc',
    enum: Object.keys(ReactionEmoji),
    example: 'LOVE',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(ReactionEmoji, { message: 'emoji không hợp lệ' })
  @IsNotEmpty({ message: 'emoji không được để trống' })
  emoji: ReactionEmoji;
}
