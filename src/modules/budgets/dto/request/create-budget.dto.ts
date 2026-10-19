import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { RecurrencePeriod } from '../../../../common/enums/recurrence-period.enum';

export class CreateBudgetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  walletId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  categoryId: string;

  @ApiProperty({ enum: RecurrencePeriod, example: RecurrencePeriod.MONTHLY })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(RecurrencePeriod)
  period: RecurrencePeriod;

  @ApiProperty({ minimum: 0.01, example: 5000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  limitAmount: number;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRollover?: boolean = false;
}
