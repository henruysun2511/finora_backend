import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DashboardQueryDto } from './dashboard-query.dto';
import { CashFlowPeriod } from '../../dashboards.constant';

export class CashFlowQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: CashFlowPeriod, default: CashFlowPeriod.MONTH })
  @IsOptional()
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