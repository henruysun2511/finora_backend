import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryQueryDto } from './dto/request/category-query.dto';
import { CategoryResponseDto } from './dto/response/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Helper kiểm tra user có quyền Admin hệ thống hay không
   */
  private checkIsAdmin(user: any): boolean {
    if (!user) return false;
    if (user.isSysAdmin) return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some((r: any) =>
        typeof r === 'string' ? r === 'ADMIN' : r?.code === 'ADMIN',
      );
    }
    return false;
  }

  /**
   * POST /api/v1/categories
   * Tạo danh mục tài chính mới.
   */
  @Post()
  @SwaggerDoc({
    summary: 'Tạo danh mục mới',
    description:
      'Tạo danh mục tài chính mới (thu nhập/chi tiêu), hỗ trợ danh mục phân cấp cha - con.',
    bodyType: CreateCategoryDto,
    responseType: CategoryResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateCategoryDto,
  ) {
    const isAdmin = this.checkIsAdmin(user);
    const data = await this.categoriesService.createCategory(user?.id, dto, isAdmin);

    return ApiResponse.created(data, 'Tạo danh mục mới thành công');
  }

  /**
   * GET /api/v1/categories
   * Lấy danh sách danh mục (hỗ trợ lọc theo loại, tìm kiếm và dạng cây phân cấp).
   */
  @Get()
  @SwaggerDoc({
    summary: 'Lấy danh sách danh mục',
    description:
      'Lấy danh sách danh mục của người dùng và danh mục mặc định của hệ thống. Hỗ trợ lọc theo loại (type), từ khóa (search) và dựng cây phân cấp (isTree).',
    responseType: CategoryResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryQueryDto,
  ) {
    const data = await this.categoriesService.getCategories(userId, query);

    return ApiResponse.success(data, 'Lấy danh sách danh mục thành công');
  }

  /**
   * GET /api/v1/categories/:id
   * Xem chi tiết một danh mục theo ID.
   */
  @Get(':id')
  @SwaggerDoc({
    summary: 'Xem chi tiết danh mục',
    description:
      'Lấy thông tin chi tiết của danh mục mà người dùng có quyền truy cập.',
    responseType: CategoryResponseDto,
    bearerAuth: true,
  })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.categoriesService.getCategoryById(id, userId);

    return ApiResponse.success(data, 'Lấy chi tiết danh mục thành công');
  }

  /**
   * PATCH /api/v1/categories/:id
   * Cập nhật thông tin danh mục.
   */
  @Patch(':id')
  @SwaggerDoc({
    summary: 'Cập nhật danh mục',
    description:
      'Chủ sở hữu hoặc quản trị viên có thể cập nhật danh mục.',
    bodyType: UpdateCategoryDto,
    responseType: CategoryResponseDto,
    bearerAuth: true,
  })
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const isAdmin = this.checkIsAdmin(user);
    const data = await this.categoriesService.updateCategory(id, user?.id, dto, isAdmin);

    return ApiResponse.success(data, 'Cập nhật danh mục thành công');
  }

  /**
   * DELETE /api/v1/categories/:id
   * Xóa danh mục tài chính (soft delete).
   */
  @Delete(':id')
  @SwaggerDoc({
    summary: 'Xóa danh mục',
    description:
      'Xóa danh mục. Quản trị viên có quyền xóa danh mục hệ thống.',
    bearerAuth: true,
  })
  async remove(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isAdmin = this.checkIsAdmin(user);
    await this.categoriesService.deleteCategory(id, user?.id, isAdmin);

    return ApiResponse.noContent('Xóa danh mục thành công');
  }
}
