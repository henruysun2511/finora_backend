import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DashboardQueryDto } from './dashboard-query.dto';
import { CashFlowPeriod } from '../../dashboards.constant';

export class CashFlowQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: CashFlowPeriod, default: CashFlowPeriod.MONTH })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.toUpperCase().trim();
    if (v === 'DAY_7' || v === '7_DAYS') return CashFlowPeriod.WEEK;
    if (v === 'DAY_30' || v === '30_DAYS') return CashFlowPeriod.MONTH;
    if (v === 'DAY_90' || v === '90_DAYS') return CashFlowPeriod.QUARTER;
    if (v === 'MONTH_12' || v === '12_MONTHS') return CashFlowPeriod.YEAR;
    return v as CashFlowPeriod;
  })
  @IsEnum(CashFlowPeriod)
  period?: CashFlowPeriod = CashFlowPeriod.MONTH;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}