// src/modules/exchange-rates/dto/request/exchange-rate-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ConvertQueryDto {
  @ApiPropertyOptional({
    example: 1000000,
    description: 'Số tiền cần tính toán quy đổi thử nghiệm',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount phải là số tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'amount không được âm' })
  @Max(999_999_999_999.99, { message: 'amount vượt quá giới hạn tối đa' })
  amount?: number;
}
