# Hướng Dẫn Xây Dựng Module Hoàn Chỉnh Trong Finora Backend (`finora_be`)

> Tài liệu chuẩn hóa kiến trúc và quy trình phát triển một module nghiệp vụ (Feature-based Modular Architecture) từ A-Z trong hệ sinh thái **Finora Backend** (NestJS 10, TypeORM 0.3, PostgreSQL).

---

## Mục lục

1. [Tổng quan Kiến trúc & Nguyên tắc Thiết kế](#1-tổng-quan-kiến-trúc--nguyên-tắc-thiết-kế)
2. [Cấu trúc Thư mục Chuẩn của 1 Module](#2-cấu-trúc-thư-mục-chuẩn-của-1-module)
3. [Quy trình 8 Bước Xây Dựng Module Chi Tiết](#3-quy-trình-8-bước-xây-dựng-module-chi-tiết)
   - [Bước 1: Khởi tạo Hằng số & Enum (`*.constant.ts`)](#bước-1-khởi-tạo-hằng-số--enum-constantts)
   - [Bước 2: Định nghĩa Entity Database (`entities/*.entity.ts`)](#bước-2-định-nghĩa-entity-database-entitiesentityts)
   - [Bước 3: Định nghĩa DTOs Request & Response (`dto/`)](#bước-3-định-nghĩa-dtos-request--response-dto)
   - [Bước 4: Định nghĩa Custom Exception (`exceptions/*.exception.ts`)](#bước-4-định-nghĩa-custom-exception-exceptionsexceptionts)
   - [Bước 5: Xây dựng Mapper 2 Chiều (`mapper/*.mapper.ts`)](#bước-5-xây-dựng-mapper-2-chiều-mappermapperts)
   - [Bước 6: Xây dựng Tầng Repository (`repository/*.repository.ts`)](#bước-6-xây-dựng-tầng-repository-repositoryrepositoryts)
   - [Bước 7: Xây dựng Tầng Nghiệp Vụ Service (`*.service.ts`)](#bước-7-xây-dựng-tầng-nghiệp-vụ-service-servicets)
   - [Bước 8: Xây dựng Tầng Controller & Swagger API Docs (`*.controller.ts`)](#bước-8-xây-dựng-tầng-controller--swagger-api-docs-controllerts)
4. [Đăng ký Module vào Hệ Thống](#4-đăng-ký-module-vào-hệ-thống)
5. [Quy trình Migration Database](#5-quy-trình-migration-database)
6. [Bảng Checklist Kiểm Thử & Nghiệm Thu Module](#6-bảng-checklist-kiểm-thử--nghiệm-thu-module)

---

## 1. Tổng quan Kiến trúc & Nguyên tắc Thiết kế

Finora Backend áp dụng mô hình **Clean Layered Architecture** kết hợp thiết kế hướng tính năng (Feature-based Modular Structure). Mỗi module đại diện cho một miền nghiệp vụ độc lập, tự đóng gói toàn bộ logic từ routing, validation, business rules, DB query cho đến chuyển đổi dữ liệu DTO.

```
Client (HTTP Request)
  │  /api/v1/{module}
  ▼
[ValidationPipe] ───────────── (Whitelist + DTO validation)
  │
  ▼
[Controller] ───────────────── (Route handling + Swagger OpenAPI documentation)
  │
  ▼
[Service] ──────────────────── (Business logic + Transaction + Error throwing)
  │
  ▼
[Repository] ───────────────── (TypeORM QueryBuilder + Pagination + Filters)
  │
  ▼
[PostgreSQL Database]
  │
  ▼
[Mapper] ───────────────────── (Bi-directional: DTO ↔ Entity ↔ Response DTO)
  │
  ▼
[ResponseInterceptor] ──────── (ApiResponse wrapper: { success, statusCode, message, data, timestamp })
  │
  ▼
Client (HTTP Response)
```

### Các nguyên tắc cốt lõi:
1. **Không rò rỉ TypeORM Entity ra ngoài**: Controller và Client tuyệt đối không bao giờ nhận trực tiếp đối tượng Entity của TypeORM. Tất cả dữ liệu trả ra phải qua `Mapper` chuyển thành `Response DTO`.
2. **Tách biệt Data Access**: Service không trực tiếp query TypeORM Repository tổng quát mà ủy quyền qua custom Repository class của module (để dễ bảo trì query phức tạp và mock test).
3. **Chuẩn hóa lỗi qua `AppError`**: Không ném trực tiếp `Error` mặc định của JS hoặc `HttpException` thuần mà kế thừa `AppError` kèm `code`, `message` và `statusCode` rõ ràng.
4. **Chuẩn hóa Response**: Mọi endpoint trả dữ liệu qua `ApiResponse.success()`, `ApiResponse.created()`, hoặc `ApiResponse.noContent()`.

---

## 2. Cấu trúc Thư mục Chuẩn của 1 Module

Mỗi module mới được đặt tại `src/modules/<tên-module>/`. Dưới đây là cây thư mục mẫu chuẩn mực:

```text
src/modules/<feature-name>/
├── dto/
│   ├── request/
│   │   ├── create-<feature>.dto.ts     # DTO thêm mới + validate class-validator
│   │   ├── update-<feature>.dto.ts     # DTO cập nhật + validate
│   │   └── <feature>-query.dto.ts      # DTO phân trang, lọc, tìm kiếm từ khóa, sắp xếp
│   └── response/
│       └── <feature>.dto.ts            # DTO trả về cho client (@ApiProperty)
├── entities/
│   └── <feature>.entity.ts             # TypeORM Entity (kế thừa BaseEntity)
├── exceptions/
│   └── <feature>.exception.ts          # Custom exceptions (kế thừa AppError)
├── mapper/
│   └── <feature>.mapper.ts             # Chuyển đổi qua lại giữa DTO và Entity
├── repository/
│   └── <feature>.repository.ts         # QueryBuilder, phân trang, bộ lọc DB
├── <feature>.constant.ts               # Enum, hằng số cấu hình, whitelist sort fields
├── <feature>.controller.ts             # REST Controller & Swagger documentation
├── <feature>.service.ts                # Business logic
└── <feature>.module.ts                 # Module definition, import TypeORM & export service
```

---

## 3. Quy trình 8 Bước Xây Dựng Module Chi Tiết

*Dưới đây là ví dụ minh họa từng bước xây dựng module quản lý danh mục (`categories`). Bạn có thể áp dụng tương tự cho bất kỳ module nghiệp vụ nào khác.*

---

### Bước 1: Khởi tạo Hằng số & Enum (`*.constant.ts`)

File: `src/modules/categories/categories.constant.ts`

Chứa các Enum quản lý trạng thái, hằng số phân trang và danh sách trắng các trường được phép sắp xếp (`sortBy`) để bảo vệ an toàn câu lệnh SQL.

```typescript
export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const CATEGORIES_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  // Danh sách trắng các trường an toàn cho ORDER BY
  ALLOWED_SORT_FIELDS: ['name', 'displayOrder', 'createdAt', 'updatedAt'] as const,
};
```

---

### Bước 2: Định nghĩa Entity Database (`entities/*.entity.ts`)

File: `src/modules/categories/entities/category.entity.ts`

- Luôn kế thừa `BaseEntity` từ `src/common/entities/base.entity.ts` (đã có sẵn `id` UUID v4, `created_at`, `updated_at`, `deleted_at`).
- Đặt tên bảng dạng số nhiều chữ thường (ví dụ: `categories`).
- Đánh `@Index()` trên các cột hay tìm kiếm hoặc sắp xếp.

```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CategoryStatus } from '../categories.constant';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 150 })
  @Index()
  name: string;

  @Column({ unique: true, length: 100 })
  @Index()
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;
}
```

---

### Bước 3: Định nghĩa DTOs Request & Response (`dto/`)

#### 1. Create DTO (`dto/request/create-category.dto.ts`)
Sử dụng `class-validator` để kiểm tra chặt chẽ dữ liệu đầu vào và `@nestjs/swagger` để sinh tài liệu API tự động.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CategoryStatus } from '../../categories.constant';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Đồ điện tử', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Tên danh mục tối thiểu 2 ký tự' })
  @MaxLength(150, { message: 'Tên danh mục tối đa 150 ký tự' })
  name: string;

  @ApiProperty({ example: 'ELECTRONICS', description: 'Mã danh mục duy nhất' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Mã danh mục tối thiểu 2 ký tự' })
  @MaxLength(100, { message: 'Mã danh mục tối đa 100 ký tự' })
  code: string;

  @ApiPropertyOptional({ example: 'Các thiết bị công nghệ điện tử' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị không được âm' })
  displayOrder?: number = 0;

  @ApiPropertyOptional({ enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CategoryStatus, { message: 'Trạng thái không hợp lệ' })
  status?: CategoryStatus = CategoryStatus.ACTIVE;
}
```

#### 2. Update DTO (`dto/request/update-category.dto.ts`)
Kế thừa `PartialType` từ `@nestjs/swagger` để mọi trường đều thành tùy chọn (optional).

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

#### 3. Query DTO (`dto/request/category-query.dto.ts`)
Xử lý tìm kiếm mờ, lọc trạng thái, phân trang (`page`, `limit`, getter `skip`) và sắp xếp.

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CATEGORIES_CONSTANTS, CategoryStatus } from '../../categories.constant';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

export class CategoryQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CATEGORIES_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CATEGORIES_CONSTANTS.PAGINATION.MAX_LIMIT)
  limit: number = CATEGORIES_CONSTANTS.PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc mã' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: CategoryStatus })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({ example: 'createdAt', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

#### 4. Response DTO (`dto/response/category.dto.ts`)
Định nghĩa cấu trúc dữ liệu trả về an toàn cho client.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { CategoryStatus } from '../../categories.constant';

export class CategoryResponse {
  @ApiProperty({ example: 'c0a80123-7b10-4f9e-a123-456789abcdef' })
  id: string;

  @ApiProperty({ example: 'Đồ điện tử' })
  name: string;

  @ApiProperty({ example: 'ELECTRONICS' })
  code: string;

  @ApiProperty({ example: 'Các thiết bị điện tử', nullable: true })
  description?: string;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ enum: CategoryStatus, example: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @ApiProperty({ example: '2026-09-18T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-18T10:00:00.000Z' })
  updatedAt: Date;
}
```

---

### Bước 4: Định nghĩa Custom Exception (`exceptions/*.exception.ts`)

File: `src/modules/categories/exceptions/category.exception.ts`

Kế thừa `AppError` từ `src/common/errors/app.error.ts`.

```typescript
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';

export class CategoryCodeAlreadyExistsException extends AppError {
  constructor(code: string) {
    super(
      {
        code: 'CATEGORY_CODE_ALREADY_EXISTS',
        message: `Mã danh mục '${code}' đã tồn tại trong hệ thống`,
        statusCode: HttpStatus.CONFLICT,
        details: { field: 'code', value: code },
      },
      `Mã danh mục '${code}' đã tồn tại trong hệ thống`,
    );
  }
}
```

---

### Bước 5: Xây dựng Mapper 2 Chiều (`mapper/*.mapper.ts`)

File: `src/modules/categories/mapper/category.mapper.ts`

Mapper chịu trách nhiệm đóng gói việc chuyển đổi giữa Entity và DTO, đảm bảo quy tắc không để rò rỉ Entity.

```typescript
import { Injectable } from '@nestjs/common';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';
import { CategoryResponse } from '../dto/response/category.dto';

@Injectable()
export class CategoryMapper {
  // DTO → Entity
  toEntity(dto: CreateCategoryDto): Partial<Category> {
    return {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      displayOrder: dto.displayOrder ?? 0,
      status: dto.status,
    };
  }

  // Update DTO vào Entity có sẵn
  mergeEntity(category: Category, dto: UpdateCategoryDto): Category {
    return Object.assign(category, dto);
  }

  // Entity → Response DTO
  toResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      displayOrder: category.displayOrder,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  toResponseList(categories: Category[]): CategoryResponse[] {
    return categories.map((item) => this.toResponse(item));
  }
}
```

---

### Bước 6: Xây dựng Tầng Repository (`repository/*.repository.ts`)

File: `src/modules/categories/repository/category.repository.ts`

- Inject `@InjectRepository(Category)` của TypeORM.
- Viết hàm `findPaginated` dùng `SelectQueryBuilder`, luôn lọc `deletedAt IS NULL`.
- Lọc theo keyword dùng `ILIKE`.
- Kiểm tra whitelist sort field để tránh SQL Injection.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CategoryQueryDto } from '../dto/request/category-query.dto';
import { CATEGORIES_CONSTANTS } from '../categories.constant';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findById(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Category | null> {
    return this.repo.findOne({ where: { code } });
  }

  save(category: Category): Promise<Category> {
    return this.repo.save(category);
  }

  create(data: Partial<Category>): Category {
    return this.repo.create(data);
  }

  async findPaginated(query: CategoryQueryDto): Promise<[Category[], number]> {
    const qb = this.repo.createQueryBuilder('category')
      .where('category.deletedAt IS NULL');

    // Tìm kiếm từ khóa mờ theo name hoặc code
    if (query.keyword && query.keyword.trim() !== '') {
      qb.andWhere(
        '(category.name ILIKE :kw OR category.code ILIKE :kw)',
        { kw: `%${query.keyword.trim()}%` },
      );
    }

    // Lọc theo trạng thái
    if (query.status) {
      qb.andWhere('category.status = :status', { status: query.status });
    }

    // Kiểm tra trường sort có trong danh sách cho phép không
    const allowedSortFields: readonly string[] = CATEGORIES_CONSTANTS.ALLOWED_SORT_FIELDS;
    const sortField = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';

    return qb
      .orderBy(`category.${sortField}`, query.sortOrder ?? 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
  }

  softDelete(id: string): Promise<any> {
    return this.repo.softDelete(id);
  }
}
```

---

### Bước 7: Xây dựng Tầng Nghiệp Vụ Service (`*.service.ts`)

File: `src/modules/categories/categories.service.ts`

- Thực thi toàn bộ business rules.
- Kiểm tra tính duy nhất (Unique validation) trước khi tạo hoặc cập nhật.
- Ném lỗi `notFound('tên đối tượng')` nếu không tìm thấy.
- Trả về `PaginatedResponse.of()` cho danh sách phân trang.

```typescript
import { Injectable } from '@nestjs/common';
import { CategoryRepository } from './repository/category.repository';
import { CategoryMapper } from './mapper/category.mapper';
import { notFound } from '../../common/errors/app.error';
import { CategoryCodeAlreadyExistsException } from './exceptions/category.exception';
import { PaginatedResponse } from '../../common/response/api-response';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryQueryDto } from './dto/request/category-query.dto';
import { CategoryResponse } from './dto/response/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly categoryMapper: CategoryMapper,
  ) {}

  // 1. TẠO MỚI
  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const existing = await this.categoryRepo.findByCode(dto.code);
    if (existing) {
      throw new CategoryCodeAlreadyExistsException(dto.code);
    }

    const entityData = this.categoryMapper.toEntity(dto);
    const entity = this.categoryRepo.create(entityData);
    const saved = await this.categoryRepo.save(entity);
    return this.categoryMapper.toResponse(saved);
  }

  // 2. DANH SÁCH (Phân trang + Lọc)
  async findAll(query: CategoryQueryDto): Promise<PaginatedResponse<CategoryResponse>> {
    const [categories, total] = await this.categoryRepo.findPaginated(query);
    return PaginatedResponse.of(
      this.categoryMapper.toResponseList(categories),
      total,
      query.page,
      query.limit,
    );
  }

  // 3. CHI TIẾT THEO ID
  async findOne(id: string): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw notFound('danh mục');
    }
    return this.categoryMapper.toResponse(category);
  }

  // 4. CẬP NHẬT
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw notFound('danh mục');
    }

    // Nếu đổi code thì phải kiểm tra xem code mới có bị trùng không
    if (dto.code && dto.code !== category.code) {
      const existing = await this.categoryRepo.findByCode(dto.code);
      if (existing) {
        throw new CategoryCodeAlreadyExistsException(dto.code);
      }
    }

    this.categoryMapper.mergeEntity(category, dto);
    const updated = await this.categoryRepo.save(category);
    return this.categoryMapper.toResponse(updated);
  }

  // 5. XÓA MỀM (Soft Delete)
  async remove(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw notFound('danh mục');
    }
    await this.categoryRepo.softDelete(id);
  }
}
```

---

### Bước 8: Xây dựng Tầng Controller & Swagger API Docs (`*.controller.ts`)

File: `src/modules/categories/categories.controller.ts`

- Sử dụng decorator `@SwaggerDoc()` từ `src/common/swagger/swagger-doc.ts` để gộp `ApiOperation`, `ApiBody`, `ApiResponse`.
- Dùng `ParseUUIDPipe` cho các tham số ID.
- Bọc kết quả trả về bằng `ApiResponse.created()`, `ApiResponse.success()`, `ApiResponse.noContent()`.

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryQueryDto } from './dto/request/category-query.dto';
import { CategoryResponse } from './dto/response/category.dto';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @SwaggerDoc({
    summary: 'Tạo danh mục mới',
    description: 'Thêm mới danh mục, tự động kiểm tra tính duy nhất của mã danh mục (code).',
    bodyType: CreateCategoryDto,
    responseType: CategoryResponse,
    status: 201,
  })
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return ApiResponse.created(data, 'Tạo danh mục mới thành công');
  }

  @Get()
  @SwaggerDoc({
    summary: 'Danh sách danh mục (Phân trang & Lọc)',
    description: 'Tìm kiếm từ khóa theo tên/mã, lọc trạng thái và sắp xếp.',
    responseType: CategoryResponse,
    isArray: true,
  })
  async findAll(@Query() query: CategoryQueryDto) {
    const data = await this.categoriesService.findAll(query);
    return ApiResponse.success(data, 'Lấy danh sách danh mục thành công');
  }

  @Get(':id')
  @SwaggerDoc({
    summary: 'Chi tiết danh mục theo ID',
    description: 'Lấy thông tin chi tiết một danh mục theo UUID.',
    responseType: CategoryResponse,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.categoriesService.findOne(id);
    return ApiResponse.success(data, 'Lấy thông tin chi tiết danh mục thành công');
  }

  @Patch(':id')
  @SwaggerDoc({
    summary: 'Cập nhật thông tin danh mục',
    description: 'Cập nhật thông tin danh mục theo UUID.',
    bodyType: UpdateCategoryDto,
    responseType: CategoryResponse,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(id, dto);
    return ApiResponse.success(data, 'Cập nhật danh mục thành công');
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: 'Xóa mềm danh mục',
    description: 'Đánh dấu thời gian xóa mềm (soft delete), bảo toàn dữ liệu lịch sử trong DB.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
    return ApiResponse.noContent('Xóa danh mục thành công');
  }
}
```

---

## 4. Đăng ký Module vào Hệ Thống

### 1. Khai báo Module chính (`categories.module.ts`)
File: `src/modules/categories/categories.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './repository/category.repository';
import { CategoryMapper } from './mapper/category.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryRepository, CategoryMapper],
  exports: [CategoriesService], // Export nếu các module khác cần sử dụng
})
export class CategoriesModule {}
```

### 2. Import vào `app.module.ts`
File: `src/app.module.ts`

Thêm `CategoriesModule` vào mảng `imports` của `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './shared/database/database.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module'; // Import mới

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    CategoriesModule, // Thêm vào đây
  ],
})
export class AppModule {}
```

---

## 5. Quy trình Migration Database

Khi tạo Entity mới hoặc thay đổi cấu trúc bảng:

1. **Sinh file migration tự động từ Entity:**
   ```bash
   npm run migration:generate -- src/database/migrations/CreateCategoriesTable
   ```
2. **Kiểm tra file migration vừa sinh** trong thư mục `src/database/migrations/`.
3. **Thực thi migration vào database:**
   ```bash
   npm run migration:run
   ```
4. **Nếu cần hoàn tác (revert):**
   ```bash
   npm run migration:revert
   ```

---

## 6. Bảng Checklist Kiểm Thử & Nghiệm Thu Module

Trước khi submit Pull Request cho một module mới, hãy đảm bảo hoàn thành checklist sau:

| STT | Hạng mục kiểm tra | Chi tiết kiểm tra | Trạng thái |
|:---:|:---|:---|:---:|
| 1 | **Entity & BaseEntity** | Kế thừa `BaseEntity` (id UUID, createdAt, updatedAt, deletedAt) | [ ] |
| 2 | **Validation DTO** | Mọi field trong request DTO có decorator từ `class-validator` | [ ] |
| 3 | **Swagger Docs** | Controller dùng `@SwaggerDoc()` đầy đủ summary, bodyType, responseType | [ ] |
| 4 | **UUID Safety** | Tất cả param `:id` trên controller đều có `ParseUUIDPipe` | [ ] |
| 5 | **Bảo mật dữ liệu** | Không trả trực tiếp Entity ra ngoài API, 100% qua Mapper | [ ] |
| 6 | **SQL Injection Safety** | Trường `sortBy` được đối chiếu qua `ALLOWED_SORT_FIELDS` whitelist | [ ] |
| 7 | **Xử lý ngoại lệ** | Dùng custom exception kế thừa `AppError` hoặc helper `notFound()` | [ ] |
| 8 | **Unit Tests** | Có đầy đủ test cho Controller, Service và Repository (Xem [testing-guide.md](./testing-guide.md)) | [ ] |
| 9 | **Kiểm tra Build & Test** | Chạy `npm run build` và `npm test` không có lỗi | [ ] |
