# Hướng Dẫn Viết Unit Test Toàn Diện Trong Finora Backend (`finora_be`)

> Tài liệu chuẩn hóa kỹ thuật và phương pháp viết Unit Test cho Controller, Service và Repository trong hệ sinh thái **Finora Backend** (NestJS 10, TypeORM 0.3, Jest 29, TypeScript 5).

---

## Mục lục

1. [Triết lý & Nguyên tắc Kiểm thử](#1-triết-lý--nguyên-tắc-kiểm-thử)
2. [Cấu trúc Thư mục & Cấu hình Jest](#2-cấu-trúc-thư-mục--cấu-hình-jest)
3. [Mô hình Kiểm thử 3 Tầng (3-Layer Testing Strategy)](#3-mô-hình-kiểm-thử-3-tầng-3-layer-testing-strategy)
4. [Hướng dẫn Chi tiết Tầng 1: Controller Unit Test](#4-hướng-dẫn-chi-tiết-tầng-1-controller-unit-test)
5. [Hướng dẫn Chi tiết Tầng 2: Service Unit Test](#5-hướng-dẫn-chi-tiết-tầng-2-service-unit-test)
6. [Hướng dẫn Chi tiết Tầng 3: Repository Unit Test](#6-hướng-dẫn-chi-tiết-tầng-3-repository-unit-test)
7. [Các Lệnh Chạy Test & Báo Cáo Coverage](#7-các-lệnh-chạy-test--báo-cáo-coverage)
8. [Những Lỗi Phổ Biến & Cách Khắc Phục (Troubleshooting & Best Practices)](#8-những-lỗi-phổ-biến--cách-khắc-phục-troubleshooting--best-practices)

---

## 1. Triết lý & Nguyên tắc Kiểm thử

Trong dự án Finora Backend, tầng kiểm thử tự động (Automated Unit Testing) đóng vai trò sống còn để đảm bảo tính ổn định và ngăn ngừa lỗi hồi quy (regression bugs).

### Nguyên tắc vàng:
1. **Kiểm thử cô lập (Isolated Testing)**: Mỗi tầng chỉ kiểm tra đúng trách nhiệm của nó.
   - **Controller Spec**: Chỉ kiểm tra nhận request, gọi đúng Service method và bọc `ApiResponse`. Dependency Service phải được **Mock**.
   - **Service Spec**: Chỉ kiểm tra logic nghiệp vụ, ràng buộc dữ liệu, ngoại lệ `AppError`. Dependency Repository phải được **Mock**.
   - **Repository Spec**: Kiểm tra việc xây dựng query SQL (QueryBuilder), phân trang, sắp xếp, lọc điều kiện. TypeORM `Repository` và `SelectQueryBuilder` phải được **Mock**.
2. **Quy tắc AAA (Arrange - Act - Assert)**:
   - **Arrange**: Chuẩn bị dữ liệu mẫu (mock data), giả lập kết quả trả về của các dependency (`mockResolvedValue`, `mockReturnValue`).
   - **Act**: Kích hoạt phương thức cần kiểm thử.
   - **Assert**: So sánh kết quả thực tế với kỳ vọng (`expect(...)`).
3. **Reset Mock sạch sẽ**: Luôn gọi `jest.clearAllMocks()` trong hook `beforeEach()` để các test case không ảnh hưởng lẫn nhau.

---

## 2. Cấu trúc Thư mục & Cấu hình Jest

### Cấu trúc thư mục `test/`
Toàn bộ file test được gom tập trung trong thư mục gốc `test/` theo từng module tương ứng:

```text
finora_be/
├── test/
│   ├── products/
│   │   ├── products.controller.spec.ts  # Test Controller
│   │   ├── products.service.spec.ts     # Test Service
│   │   └── products.repository.spec.ts  # Test Repository
│   └── categories/                      # (Khi thêm module mới)
│       ├── categories.controller.spec.ts
│       ├── categories.service.spec.ts
│       └── categories.repository.spec.ts
```

### Cấu hình `jest.config.ts`
Dự án đã cấu hình sẵn alias tương thích tuyệt đối với `tsconfig.json`:
- `modules/*` ➔ `src/modules/*`
- `common/*` ➔ `src/common/*`
- `config/*` ➔ `src/config/*`
- `database/*` ➔ `src/database/*`

> **Lưu ý**: Hãy dùng alias ngắn gọn khi import trong file test, ví dụ:
> ```typescript
> import { ProductsService } from 'modules/products/products.service';
> import { ApiResponse } from 'common/response/api-response';
> ```

---

## 3. Mô hình Kiểm thử 3 Tầng (3-Layer Testing Strategy)

| Tầng | Đối tượng Test | Đối tượng Cần Mock | Mục tiêu Kiểm thử |
| :--- | :--- | :--- | :--- |
| **Controller** | `FeatureController` | `FeatureService` | - Đúng HTTP Status Code<br>- Trả về bọc `ApiResponse.success` / `created` / `noContent`<br>- Truyền đúng param / query / DTO vào Service |
| **Service** | `FeatureService` | `FeatureRepository` (dùng thật `Mapper`) | - Nghiệp vụ chính (Happy Path)<br>- Ném ngoại lệ khi trùng mã (`AppError`)<br>- Ném `notFound` khi ID không tồn tại<br>- Định dạng danh sách qua `PaginatedResponse` |
| **Repository** | `FeatureRepository` | TypeORM `Repository<T>` & `SelectQueryBuilder<T>` | - Lọc `deletedAt IS NULL`<br>- Ghép chuỗi `ILIKE` keyword<br>- Lọc status, khoảng giá, trạng thái boolean<br>- Sort fallback an toàn khi sortBy không hợp lệ |

---

## 4. Hướng dẫn Chi tiết Tầng 1: Controller Unit Test

File mẫu: `test/<feature>/<feature>.controller.spec.ts`

### Các bước thực hiện:
1. Khai báo `mockService` với tất cả các method dùng `jest.fn()`.
2. Tạo module kiểm thử với `Test.createTestingModule({ controllers: [...], providers: [...] })`.
3. Kiểm thử từng endpoint: `create`, `findAll`, `findOne`, `update`, `remove`.

### Code mẫu chuẩn Controller:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from 'modules/categories/categories.controller';
import { CategoriesService } from 'modules/categories/categories.service';
import { CategoryStatus } from 'modules/categories/categories.constant';
import { CreateCategoryDto } from 'modules/categories/dto/request/create-category.dto';
import { CategoryResponse } from 'modules/categories/dto/response/category.dto';
import { ApiResponse, PaginatedResponse } from 'common/response/api-response';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockId = 'c0a80123-7b10-4f9e-a123-456789abcdef';

  const mockResponse: CategoryResponse = {
    id: mockId,
    name: 'Đồ điện tử',
    code: 'ELECTRONICS',
    description: 'Thiết bị công nghệ',
    displayOrder: 1,
    status: CategoryStatus.ACTIVE,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  // Mock toàn bộ method của Service
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  // 1. TEST CREATE
  describe('create', () => {
    it('should create a category and return ApiResponse.created', async () => {
      // Arrange
      const dto: CreateCategoryDto = {
        name: 'Đồ điện tử',
        code: 'ELECTRONICS',
      };
      mockService.create.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.create(dto);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual(mockResponse);
    });
  });

  // 2. TEST FIND ALL
  describe('findAll', () => {
    it('should return paginated list wrapped in ApiResponse.success', async () => {
      // Arrange
      const query = { page: 1, limit: 10 } as any;
      const paginatedData = PaginatedResponse.of([mockResponse], 1, 1, 10);
      mockService.findAll.mockResolvedValue(paginatedData);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result.statusCode).toBe(200);
      expect(result.data.items).toHaveLength(1);
    });
  });

  // 3. TEST FIND ONE
  describe('findOne', () => {
    it('should return item detail by ID', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockId);

      expect(mockService.findOne).toHaveBeenCalledWith(mockId);
      expect(result.data).toEqual(mockResponse);
    });
  });

  // 4. TEST REMOVE
  describe('remove', () => {
    it('should delete item and return ApiResponse.noContent', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockId);

      expect(mockService.remove).toHaveBeenCalledWith(mockId);
      expect(result.data).toBeNull();
    });
  });
});
```

---

## 5. Hướng dẫn Chi tiết Tầng 2: Service Unit Test

File mẫu: `test/<feature>/<feature>.service.spec.ts`

### Các bước thực hiện:
1. Mock Repository (`mockRepo = { findById: jest.fn(), findByCode: jest.fn(), save: jest.fn(), ... }`).
2. Khai báo `Mapper` thật (`CategoryMapper`) trong `providers` (vì Mapper chỉ là pure transformation, không có I/O nên dùng thật để tăng độ tin cậy của test).
3. Kiểm thử cả 2 luồng:
   - **Happy Path**: Tạo thành công, tìm thấy bản ghi, update thành công.
   - **Unhappy Path / Exception**: Ném lỗi trùng mã (`AppError`), ném lỗi `notFound`, ném lỗi DB.

### Code mẫu chuẩn Service:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from 'modules/categories/categories.service';
import { CategoryRepository } from 'modules/categories/repository/category.repository';
import { CategoryMapper } from 'modules/categories/mapper/category.mapper';
import { CategoryStatus } from 'modules/categories/categories.constant';
import { CategoryCodeAlreadyExistsException } from 'modules/categories/exceptions/category.exception';
import { AppError } from 'common/errors/app.error';
import { Category } from 'modules/categories/entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: CategoryRepository;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockEntity: Category = {
    id: 'c0a80123-7b10-4f9e-a123-456789abcdef',
    name: 'Đồ điện tử',
    code: 'ELECTRONICS',
    description: 'Thiết bị công nghệ',
    displayOrder: 1,
    status: CategoryStatus.ACTIVE,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
  } as Category;

  const mockRepo = {
    findById: jest.fn(),
    findByCode: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findPaginated: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoryRepository,
          useValue: mockRepo,
        },
        CategoryMapper, // Dùng real mapper
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<CategoryRepository>(CategoryRepository);
    jest.clearAllMocks();
  });

  // TEST CREATE
  describe('create', () => {
    it('should successfully create category when code is unique', async () => {
      // Arrange
      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockEntity);
      mockRepo.save.mockResolvedValue(mockEntity);

      // Act
      const result = await service.create({
        name: 'Đồ điện tử',
        code: 'ELECTRONICS',
      });

      // Assert
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ELECTRONICS');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.code).toBe('ELECTRONICS');
    });

    it('should throw CategoryCodeAlreadyExistsException if code exists', async () => {
      // Arrange: Giả lập code đã tồn tại
      mockRepo.findByCode.mockResolvedValue(mockEntity);

      // Act & Assert
      await expect(
        service.create({ name: 'Trùng mã', code: 'ELECTRONICS' })
      ).rejects.toThrow(CategoryCodeAlreadyExistsException);
    });
  });

  // TEST FIND ONE
  describe('findOne', () => {
    it('should return item when found by ID', async () => {
      mockRepo.findById.mockResolvedValue(mockEntity);

      const result = await service.findOne(mockEntity.id);

      expect(result.id).toBe(mockEntity.id);
    });

    it('should throw AppError 404 when item not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(AppError);
    });
  });

  // TEST REMOVE
  describe('remove', () => {
    it('should call softDelete when item exists', async () => {
      mockRepo.findById.mockResolvedValue(mockEntity);
      mockRepo.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockEntity.id);

      expect(mockRepo.softDelete).toHaveBeenCalledWith(mockEntity.id);
    });
  });
});
```

---

## 6. Hướng dẫn Chi tiết Tầng 3: Repository Unit Test

File mẫu: `test/<feature>/<feature>.repository.spec.ts`

Tầng Repository là tầng khó mock nhất vì có chuỗi method chaining của `SelectQueryBuilder` (`where().andWhere().orderBy().skip().take().getManyAndCount()`).

### Kỹ thuật Mock Chuỗi QueryBuilder:
Mỗi method chaining (`where`, `andWhere`, `orderBy`, `skip`, `take`) cần trả về chính đối tượng builder (`mockReturnThis()`).

### Code mẫu chuẩn Repository:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CategoryRepository } from 'modules/categories/repository/category.repository';
import { Category } from 'modules/categories/entities/category.entity';
import { CategoryStatus } from 'modules/categories/categories.constant';
import { SortOrder } from 'common/enums/sort-order.enum';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let typeOrmRepo: Repository<Category>;

  const mockCategory: Category = {
    id: 'uuid-1',
    name: 'Danh mục 1',
    code: 'CAT-1',
    displayOrder: 1,
    status: CategoryStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Category;

  const mockTypeOrmRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        {
          provide: getRepositoryToken(Category),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
    typeOrmRepo = module.get(getRepositoryToken(Category));
    jest.clearAllMocks();
  });

  // TEST TÌM KIẾM CƠ BẢN
  describe('findById & findByCode', () => {
    it('should find item by id', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(mockCategory);

      const result = await repository.findById('uuid-1');

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toEqual(mockCategory);
    });
  });

  // TEST PHÂN TRANG & BỘ LỌC QUERY BUILDER
  describe('findPaginated', () => {
    it('should build query with keyword, status, sorting, and pagination', async () => {
      // 1. Giả lập QueryBuilder với method chaining
      const qbMock: Partial<SelectQueryBuilder<Category>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCategory], 1]),
      };

      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qbMock);

      // 2. Tham số query đầu vào
      const query = {
        page: 1,
        limit: 10,
        skip: 0,
        keyword: 'Điện tử',
        status: CategoryStatus.ACTIVE,
        sortBy: 'name',
        sortOrder: SortOrder.ASC,
      };

      // 3. Thực thi
      const [items, total] = await repository.findPaginated(query as any);

      // 4. Kiểm tra kỳ vọng
      expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('category');
      expect(qbMock.where).toHaveBeenCalledWith('category.deletedAt IS NULL');
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(category.name ILIKE :kw OR category.code ILIKE :kw)',
        { kw: '%Điện tử%' },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'category.status = :status',
        { status: CategoryStatus.ACTIVE },
      );
      expect(qbMock.orderBy).toHaveBeenCalledWith('category.name', 'ASC');
      expect(qbMock.skip).toHaveBeenCalledWith(0);
      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(items).toEqual([mockCategory]);
      expect(total).toBe(1);
    });

    it('should fallback to createdAt DESC if invalid sortBy is provided', async () => {
      const qbMock: Partial<SelectQueryBuilder<Category>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qbMock);

      const query = {
        page: 1,
        limit: 10,
        skip: 0,
        sortBy: 'non_existent_sql_injection_column',
      };

      await repository.findPaginated(query as any);

      // Fallback an toàn về createdAt DESC
      expect(qbMock.orderBy).toHaveBeenCalledWith('category.createdAt', 'DESC');
    });
  });
});
```

---

## 7. Các Lệnh Chạy Test & Báo Cáo Coverage

Mở Terminal tại thư mục `finora_be/`:

### 1. Chạy toàn bộ test suites:
```bash
npm test
```

### 2. Chạy test chỉ cho một module cụ thể:
```bash
# Chạy toàn bộ test của module products
npx jest test/products

# Chạy một file test duy nhất
npx jest test/products/products.service.spec.ts
```

### 3. Chạy chế độ Watch (tự động chạy lại khi lưu file code):
```bash
npm run test:watch
```

### 4. Đo lường tỷ lệ bao phủ code (Coverage Report):
```bash
npm run test:cov
```
Sau khi chạy xong, mở file `coverage/lcov-report/index.html` trên trình duyệt để xem chi tiết từng dòng code đã được cover hay chưa.

---

## 8. Những Lỗi Phổ Biến & Cách Khắc Phục (Troubleshooting & Best Practices)

### Lỗi 1: Type error `Property 'skip' is missing in type` hoặc `Property 'sortOrder' is missing`
- **Nguyên nhân**: DTO có getter `get skip(): number` hoặc thuộc tính có default value trong class. Khi tạo object literal thô `{ page: 1, limit: 10 }`, TypeScript sẽ báo thiếu các property này nếu khai báo `const query: ProductQueryDto = ...`.
- **Cách khắc phục**:
  - Cách 1: Ép kiểu đối tượng: `const query = { page: 1, limit: 10, skip: 0 } as ProductQueryDto;`
  - Cách 2: Khởi tạo instance: `const query = Object.assign(new ProductQueryDto(), { page: 1, limit: 10 });`
  - Đảm bảo trong file DTO, thuộc tính tùy chọn được đánh dấu `?` (ví dụ: `sortOrder?: SortOrder = SortOrder.DESC;`).

### Lỗi 2: Type error `'ASC' is not assignable to type 'SortOrder'`
- **Nguyên nhân**: Trường `sortOrder` sử dụng enum `SortOrder`. Truyền chuỗi `'ASC'` trực tiếp sẽ bị TypeScript nghiêm ngặt từ chối.
- **Cách khắc phục**: Import `SortOrder` từ `common/enums/sort-order.enum` và truyền `SortOrder.ASC` hoặc `SortOrder.DESC`.

### Lỗi 3: `TypeError: Cannot read properties of undefined (reading 'where')`
- **Nguyên nhân**: Mock `createQueryBuilder` quên trả về chuỗi các method chaining.
- **Cách khắc phục**: Khai báo mock object với `mockReturnThis()` cho tất cả các method chaining của TypeORM QueryBuilder (`where`, `andWhere`, `orderBy`, `skip`, `take`).

### Lỗi 4: Test case sau bị ảnh hưởng bởi kết quả của test case trước
- **Nguyên nhân**: Chưa reset mock count và return value.
- **Cách khắc phục**: Đặt `jest.clearAllMocks();` ngay trong hàm `beforeEach()`.

### Lỗi 5: Kiểm tra Async Exception không đúng cách
- **Sai**:
  ```typescript
  // Sai: expect không bắt được promise rejection và sẽ làm fail test
  expect(await service.findOne('invalid')).toThrow();
  ```
- **Đúng**:
  ```typescript
  // Đúng: dùng rejects.toThrow
  await expect(service.findOne('invalid')).rejects.toThrow(AppError);
  ```
