import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class SplitParticipantItemDto {
  @ApiProperty({
    description: 'UUID của người bạn được chia tiền',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID('4', { message: 'userId phải là UUID v4 hợp lệ' })
  userId: string;

  @ApiPropertyOptional({
    description:
      'Số tiền phân bổ cho người này (bắt buộc khi splitType = CUSTOM, tùy chọn khi EQUAL)',
    example: 150000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'assignedAmount phải là số' })
  @Min(0, { message: 'assignedAmount không được âm' })
  assignedAmount?: number;
}
