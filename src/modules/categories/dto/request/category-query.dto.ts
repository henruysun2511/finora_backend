import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
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
}