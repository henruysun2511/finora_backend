import { Injectable } from '@nestjs/common';
import { CategoryEntity } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { CategoryResponseDto } from '../dto/response/category.dto';

@Injectable()
export class CategoryMapper {
  toEntity(dto: Partial<CreateCategoryDto>, userId: string): Partial<CategoryEntity> {
    return {
      ...dto,
      userId,
      isDefault: false,
    };
  }

  toResponse(entity: CategoryEntity): CategoryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      icon: entity.icon,
      color: entity.color,
      isDefault: entity.isDefault,
      parentId: entity.parentId,
      children: entity.children ? entity.children.map((child) => this.toResponse(child)) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}