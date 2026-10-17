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
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const data = await this.categoriesService.createCategory(userId, dto);

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
      'Chỉ chủ sở hữu danh mục mới được cập nhật. Danh mục mặc định của hệ thống không thể chỉnh sửa.',
    bodyType: UpdateCategoryDto,
    responseType: CategoryResponseDto,
    bearerAuth: true,
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.updateCategory(id, userId, dto);

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
      'Xóa danh mục do người dùng tạo. Chặn xóa nếu là danh mục hệ thống, hoặc danh mục đã phát sinh giao dịch, liên kết ngân sách, hay đang có danh mục con.',
    bearerAuth: true,
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.categoriesService.deleteCategory(id, userId);

    return ApiResponse.noContent('Xóa danh mục thành công');
  }
}
