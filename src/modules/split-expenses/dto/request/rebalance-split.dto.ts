import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { SplitParticipantItemDto } from './split-participant-item.dto';

export class RebalanceSplitDto {
  @ApiProperty({
    description: 'Danh sách các mức phân bổ số tiền mới cho từng người bạn',
    type: [SplitParticipantItemDto],
  })
  @IsArray({ message: 'participants phải là danh sách' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 người tham gia' })
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantItemDto)
  participants: SplitParticipantItemDto[];
}
