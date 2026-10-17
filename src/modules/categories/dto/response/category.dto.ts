import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '../../entities/category.entity';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CategoryType })
  type: CategoryType;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional({ type: () => [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}