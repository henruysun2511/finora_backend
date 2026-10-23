import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số tin nhắn mỗi trang', default: 30, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 30;

  @ApiPropertyOptional({
    description: 'UUID tin nhắn mốc; chỉ lấy các tin nhắn cũ hơn tin nhắn này',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'before phải là UUID v4' })
  before?: string;
}
