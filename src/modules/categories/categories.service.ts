import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryMapper } from './mapper/category.mapper';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryQueryDto } from './dto/request/category-query.dto';
import { CategoryResponseDto } from './dto/response/category.dto';
import { CategoryEntity, CategoryType } from './entities/category.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import {
  CategoryNotFoundException,
  CategoryHasTransactionsException,
  CategoryHasBudgetsException,
  CategoryHasChildrenException,
  CategoryInvalidParentException,
  CategoryNameAlreadyExistsException,
  CategorySystemProtectedException,
  CategoryTypeConflictException,
} from './exceptions/category.exception';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly categoryMapper: CategoryMapper,
  ) {}

  // TASK-CAT01: POST /api/v1/categories
  async createCategory(userId: string, dto: CreateCategoryDto) {
    const cleanName = dto.name.trim();

    // BR4: Kiểm tra trùng tên trong cùng phạm vi sở hữu & loại danh mục
    const existing = await this.categoryRepo.findByNameAndType(cleanName, dto.type, userId);
    if (existing) {
      throw new CategoryNameAlreadyExistsException(cleanName);
    }

    // BR6: Kiểm tra danh mục cha hợp lệ
    if (dto.parentId) {
      const parent = await this.categoryRepo.findById(dto.parentId);
      if (!parent) {
        throw new CategoryInvalidParentException('Danh mục cha không tồn tại');
      }
      if (parent.userId && parent.userId !== userId && !parent.isDefault) {
        throw new CategoryInvalidParentException('Danh mục cha không thuộc quyền truy cập của bạn');
      }
      if (parent.type !== dto.type) {
        throw new CategoryInvalidParentException('Danh mục con phải cùng loại (Thu nhập/Chi tiêu) với danh mục cha');
      }
    }

    const entity = this.categoryRepo.create(this.categoryMapper.toEntity({ ...dto, name: cleanName }, userId));
    const saved = await this.categoryRepo.save(entity);
    return this.categoryMapper.toResponse(saved);
  }

  // TASK-CAT06: GET /api/v1/categories
  async getCategories(userId: string, query: CategoryQueryDto) {
    const categories = await this.categoryRepo.findAllByUser(userId, query);

    if (query.isTree) {
      return this.buildCategoryTree(categories);
    }

    return categories.map((cat) => this.categoryMapper.toResponse(cat));
  }

  // TASK-CAT02: GET /api/v1/categories/{categoryId}
  async getCategoryById(id: string, userId: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new CategoryNotFoundException(id);

    // BR2: Chỉ cho phép xem danh mục của mình hoặc danh mục hệ thống
    if (category.userId && category.userId !== userId && !category.isDefault) {
      throw new CategoryNotFoundException(id);
    }

    return this.categoryMapper.toResponse(category);
  }

  // TASK-CAT03: PATCH /api/v1/categories/{categoryId}
  async updateCategory(id: string, userId: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new CategoryNotFoundException(id);

    // BR4: Chặn sửa danh mục hệ thống
    if (category.isDefault) {
      throw new CategorySystemProtectedException();
    }

    // Kiểm tra quyền sở hữu
    if (category.userId && category.userId !== userId) {
      throw new CategoryNotFoundException(id);
    }

    const targetType = dto.type || category.type;

    // BR5: Chặn đổi loại danh mục nếu đã phát sinh giao dịch hoặc danh mục con
    if (dto.type && dto.type !== category.type) {
      const txCount = await this.categoryRepo.countTransactions(id);
      if (txCount > 0) {
        throw new CategoryTypeConflictException('Không thể thay đổi loại danh mục do đã có giao dịch phát sinh');
      }
      const childrenCount = await this.categoryRepo.countChildren(id);
      if (childrenCount > 0) {
        throw new CategoryTypeConflictException('Không thể thay đổi loại danh mục do đang chứa danh mục con');
      }
    }

    // BR6: Kiểm tra quan hệ cha - con & chống tạo vòng lặp
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new CategoryInvalidParentException('Danh mục cha không thể là chính nó');
      }
      const parent = await this.categoryRepo.findById(dto.parentId);
      if (!parent) {
        throw new CategoryInvalidParentException('Danh mục cha không tồn tại');
      }
      if (parent.userId && parent.userId !== userId && !parent.isDefault) {
        throw new CategoryInvalidParentException('Danh mục cha không thuộc quyền truy cập của bạn');
      }
      if (parent.type !== targetType) {
        throw new CategoryInvalidParentException('Danh mục con phải cùng loại (Thu nhập/Chi tiêu) với danh mục cha');
      }

      // Kiểm tra vòng lặp sâu trong cây
      let currentParent: typeof parent | null = parent;
      while (currentParent) {
        if (currentParent.id === id) {
          throw new CategoryInvalidParentException('Không thể chọn danh mục con làm danh mục cha (vòng lặp)');
        }
        currentParent = currentParent.parentId ? await this.categoryRepo.findById(currentParent.parentId) : null;
      }
    }

    // BR3: Kiểm tra trùng tên khi cập nhật (cả khi đổi tên hoặc đổi loại)
    if (dto.name || (dto.type && dto.type !== category.type)) {
      const cleanName = (dto.name ?? category.name).trim();
      const existing = await this.categoryRepo.findByNameAndType(cleanName, targetType, userId, id);
      if (existing) {
        throw new CategoryNameAlreadyExistsException(cleanName);
      }
      if (dto.name) {
        dto.name = cleanName;
      }
    }

    Object.assign(category, dto);
    category.userId = userId;
    category.isDefault = false;

    const updated = await this.categoryRepo.save(category);
    return this.categoryMapper.toResponse(updated);
  }

  // TASK-CAT04: DELETE /api/v1/categories/{categoryId}
  async deleteCategory(id: string, userId: string) {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new CategoryNotFoundException(id);

    // BR2: Chặn xóa danh mục hệ thống
    if (category.isDefault) {
      throw new CategorySystemProtectedException();
    }

    // BR1: Kiểm tra quyền sở hữu
    if (category.userId && category.userId !== userId) {
      throw new CategoryNotFoundException(id);
    }

    // BR3: Chặn xóa do giao dịch đã phát sinh
    const txCount = await this.categoryRepo.countTransactions(id);
    if (txCount > 0) {
      throw new CategoryHasTransactionsException(id);
    }

    // BR4: Chặn xóa do đang tham chiếu bởi ngân sách
    const budgetCount = await this.categoryRepo.countBudgets(id);
    if (budgetCount > 0) {
      throw new CategoryHasBudgetsException(id);
    }

    // BR4: Chặn xóa do chứa danh mục con
    const childrenCount = await this.categoryRepo.countChildren(id);
    if (childrenCount > 0) {
      throw new CategoryHasChildrenException(id);
    }

    await this.categoryRepo.softDelete(id);
  }

  /**
   * Chuyển danh sách danh mục phẳng thành cây phân cấp cha - con
   */
  private buildCategoryTree(categories: CategoryEntity[]): CategoryResponseDto[] {
    const map = new Map<string, CategoryResponseDto>();
    const roots: CategoryResponseDto[] = [];

    for (const cat of categories) {
      const dto = this.categoryMapper.toResponse(cat);
      dto.children = [];
      map.set(dto.id, dto);
    }

    for (const cat of categories) {
      const item = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    }

    return roots;
  }

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Xác thực tính hợp lệ của danh mục cho giao dịch Thu / Chi.
   * Kiểm tra tồn tại, quyền truy cập của user và tính tương thích loại (INCOME / EXPENSE).
   *
   * @param categoryId - UUID danh mục
   * @param transactionType - Loại giao dịch (EXPENSE / INCOME)
   * @param userId - UUID người dùng
   * @returns CategoryEntity
   */
  async validateCategoryForTransaction(
    categoryId: string,
    transactionType: TransactionType,
    userId: string,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) throw new CategoryNotFoundException(categoryId);

    // Quyền truy cập: danh mục hệ thống hoặc do chính user tạo
    if (category.userId && category.userId !== userId && !category.isDefault) {
      throw new CategoryNotFoundException(categoryId);
    }

    // Kiểm tra khớp loại thu/chi
    if (category.type !== CategoryType.BOTH) {
      const expectedType =
        transactionType === TransactionType.EXPENSE
          ? CategoryType.EXPENSE
          : CategoryType.INCOME;

      if (category.type !== expectedType) {
        throw new CategoryTypeConflictException(
          `Danh mục '${category.name}' (${category.type}) không phù hợp với giao dịch loại ${transactionType}`,
        );
      }
    }

    return category;
  }

  /**
   * [CROSS-MODULE] Tìm hoặc tự động tạo danh mục hệ thống (dùng cho Loans, SplitExpenses, v.v.).
   *
   * @param name - Tên danh mục (ví dụ: 'Cho vay', 'Đi vay', 'Thu hồi nợ', 'Trả nợ')
   * @param type - Loại danh mục (EXPENSE / INCOME / BOTH)
   * @param manager - EntityManager tùy chọn cho transaction
   */
  async findOrCreateSystemCategory(
    name: string,
    type: CategoryType,
    manager?: EntityManager,
  ): Promise<CategoryEntity> {
    const existing = await this.categoryRepo.findByNameAndType(name, type, '');
    if (existing) {
      return existing;
    }

    const cat = this.categoryRepo.create({
      name,
      type,
      isDefault: true,
      displayOrder: 99,
      color: '#4F46E5',
      icon: 'receipt',
    });

    return this.categoryRepo.save(cat, manager);
  }
}