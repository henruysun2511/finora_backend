import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity, CategoryType } from '../entities/category.entity';
import { CategoryQueryDto } from '../dto/request/category-query.dto';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
  ) {}

  create(entityLike: Partial<CategoryEntity>): CategoryEntity {
    return this.repo.create(entityLike);
  }

  async save(entity: CategoryEntity): Promise<CategoryEntity> {
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['children'],
    });
  }

  async findByNameAndType(
    name: string,
    type: CategoryType,
    userId: string,
    excludeId?: string,
  ): Promise<CategoryEntity | null> {
    const query = this.repo
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .andWhere('category.type = :type', { type })
      .andWhere('(category.userId = :userId OR category.isDefault = true)', { userId });

    if (excludeId) {
      query.andWhere('category.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async findAllByUser(userId: string, queryDto: CategoryQueryDto): Promise<CategoryEntity[]> {
    const query = this.repo
      .createQueryBuilder('category')
      .where('(category.userId = :userId OR category.isDefault = true)', { userId });

    if (queryDto.type) {
      query.andWhere('category.type = :type', { type: queryDto.type });
    }

    if (queryDto.search) {
      query.andWhere('LOWER(category.name) LIKE LOWER(:search)', {
        search: `%${queryDto.search.trim()}%`,
      });
    }

    query.orderBy('category.name', 'ASC');

    return query.getMany();
  }

  async countTransactions(categoryId: string): Promise<number> {
    try {
      const result = await this.repo.manager.query(
        `SELECT COUNT(1) AS count FROM transactions WHERE category_id = $1 AND deleted_at IS NULL`,
        [categoryId],
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  }

  async countBudgets(categoryId: string): Promise<number> {
    try {
      const result = await this.repo.manager.query(
        `SELECT COUNT(1) AS count FROM budgets WHERE category_id = $1 AND deleted_at IS NULL`,
        [categoryId],
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  }

  async countChildren(categoryId: string): Promise<number> {
    return this.repo.count({ where: { parentId: categoryId } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}