import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { CategoryQueryDto } from '../dto/request/category-query.dto';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  create(data: Partial<Category>): Category {
    return this.repo.create(data);
  }

  save(category: Category, manager?: EntityManager): Promise<Category> {
    if (manager) return manager.save(Category, category);
    return this.repo.save(category);
  }

  findById(id: string): Promise<Category | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  // TASK-CAT01 BR4: Kiểm tra trùng tên (Không phân biệt hoa/thường)
  findByNameAndType(
    name: string,
    type: TransactionType,
    userId: string,
    excludeId?: string,
  ): Promise<Category | null> {
    const qb = this.repo
      .createQueryBuilder('category')
      .where('LOWER(TRIM(category.name)) = LOWER(TRIM(:name))', { name })
      .andWhere('category.type = :type', { type })
      .andWhere('(category.userId = :userId OR category.isDefault = true)', { userId });

    if (excludeId) {
      qb.andWhere('category.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  // TASK-CAT06: Lấy danh sách danh mục theo phạm vi truy cập hợp lệ
  findAllByUser(userId: string, query: CategoryQueryDto): Promise<Category[]> {
    const qb = this.repo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.children', 'children')
      .leftJoinAndSelect('category.parent', 'parent')
      .where('(category.isDefault = true OR category.userId = :userId)', { userId });

    if (query.type) {
      qb.andWhere('category.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere('LOWER(category.name) LIKE LOWER(:search)', { search: `%${query.search.trim()}%` });
    }

    if (query.isTree) {
      qb.andWhere('category.parentId IS NULL');
    }

    return qb.orderBy('category.createdAt', 'ASC').getMany();
  }

  // TASK-CAT04: Kiểm tra ràng buộc giao dịch
  async countTransactions(categoryId: string): Promise<number> {
    const result = await this.repo.manager.query(
      `SELECT COUNT(1) FROM transactions WHERE category_id = $1 AND deleted_at IS NULL`,
      [categoryId],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  // TASK-CAT04: Kiểm tra ràng buộc ngân sách
  async countBudgets(categoryId: string): Promise<number> {
    const result = await this.repo.manager.query(
      `SELECT COUNT(1) FROM budgets WHERE category_id = $1 AND deleted_at IS NULL`,
      [categoryId],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  // TASK-CAT04: Kiểm tra ràng buộc danh mục con
  async countChildren(categoryId: string): Promise<number> {
    return this.repo.count({ where: { parentId: categoryId } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}