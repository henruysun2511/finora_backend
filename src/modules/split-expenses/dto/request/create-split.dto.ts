import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { SplitType } from '../../enums/split-type.enum';
import { SplitParticipantItemDto } from './split-participant-item.dto';
import { SPLIT_EXPENSE_CONSTANTS } from '../../split-expenses.constant';

export class CreateSplitDto {
  @ApiPropertyOptional({
    enum: SplitType,
    description: 'Phương thức chia tiền (EQUAL: chia đều, CUSTOM: nhập tay từng người)',
    default: SplitType.EQUAL,
    example: SplitType.EQUAL,
  })
  @IsOptional()
  @IsEnum(SplitType, { message: 'splitType phải là equal, custom hoặc percentage' })
  splitType?: SplitType = SplitType.EQUAL;

  @ApiProperty({
    description: 'Danh sách bạn bè tham gia chia tiền',
    type: [SplitParticipantItemDto],
  })
  @IsArray({ message: 'participants phải là danh sách' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 người bạn để chia tiền' })
  @ArrayMaxSize(SPLIT_EXPENSE_CONSTANTS.MAX_PARTICIPANTS, {
    message: `Không được chia quá ${SPLIT_EXPENSE_CONSTANTS.MAX_PARTICIPANTS} người`,
  })
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantItemDto)
  participants: SplitParticipantItemDto[];
}
