import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { RecurrencePeriod } from '../../../../common/enums/recurrence-period.enum';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ enum: RecurrencePeriod })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(RecurrencePeriod)
  period?: RecurrencePeriod;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  limitAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRollover?: boolean;
}
