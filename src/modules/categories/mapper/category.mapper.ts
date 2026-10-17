import { Injectable } from '@nestjs/common';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { CategoryResponseDto } from '../dto/response/category.dto';

@Injectable()
export class CategoryMapper {
  toEntity(dto: CreateCategoryDto, userId: string): Partial<Category> {
    return {
      name: dto.name.trim(),
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      parentId: dto.parentId,
      userId,
      isDefault: false,
    };
  }

  toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
      userId: category.userId,
      parentId: category.parentId,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            type: category.parent.type,
            icon: category.parent.icon,
            color: category.parent.color,
            isDefault: category.parent.isDefault,
            userId: category.parent.userId,
            parentId: category.parent.parentId,
            createdAt: category.parent.createdAt,
            updatedAt: category.parent.updatedAt,
          }
        : undefined,
      children: category.children?.map((child) => this.toResponse(child)),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}