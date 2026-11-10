import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CategoryType } from '../../entities/category.entity';

export class CategoryQueryDto {
  @ApiPropertyOptional({ enum: CategoryType })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({ example: 'Ăn' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isTree?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
