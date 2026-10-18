import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryType } from '../../entities/category.entity';
export class CreateCategoryDto {
  @ApiProperty({ example: 'Ăn uống' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ example: 'fa-utensils' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'uuid-parent-id' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}