import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DashboardQueryDto } from './dashboard-query.dto';
import { CategoryBreakdownType } from '../../dashboards.constant';

export class CategoryBreakdownQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: CategoryBreakdownType, default: CategoryBreakdownType.EXPENSE })
  @IsOptional()
  @IsEnum(CategoryBreakdownType)
  type?: CategoryBreakdownType = CategoryBreakdownType.EXPENSE;

  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month phải đúng định dạng YYYY-MM' })
  month?: string;
}