import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class RespondSplitDto {
  @ApiProperty({
    description: 'Hành động phản hồi của người tham gia',
    enum: ['accept', 'reject', 'propose'],
    example: 'accept',
  })
  @IsIn(['accept', 'reject', 'propose'], {
    message: 'action phải là accept, reject hoặc propose',
  })
  action: 'accept' | 'reject' | 'propose';

  @ApiPropertyOptional({
    description: 'Số tiền đề xuất lại (bắt buộc khi action = propose)',
    example: 120000,
    minimum: 0,
  })
  @ValidateIf((o: RespondSplitDto) => o.action === 'propose')
  @IsNumber({}, { message: 'proposedAmount phải là số hợp lệ' })
  @Min(0, { message: 'proposedAmount không được âm' })
  proposedAmount?: number;

  @ApiPropertyOptional({
    description: 'Lời nhắn / lý do khi từ chối hoặc đề xuất lại số tiền',
    example: 'Mình đến muộn chỉ gọi nước ngọt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'note phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'note không được vượt quá 500 ký tự' })
  note?: string;
}
