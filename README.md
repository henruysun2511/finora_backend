# Finora Backend Service (`finora_be`)

> Nền tảng Backend RESTful API cho hệ sinh thái **Finora** — xây dựng bằng **NestJS 10 + TypeORM 0.3 + PostgreSQL**.

---

## 1. Tổng quan Kiến trúc

Dự án áp dụng mô hình **Clean Architecture / Layered Architecture** với cấu trúc module độc lập (Feature-based Modular Architecture).

### Sơ đồ Luồng Xử Lý Request

```
Client
  │ (HTTP Request: /api/v1/products)
  ▼
[ValidationPipe] ── (Kiểm tra DTO & loại bỏ field lạ)
  │
  ▼
[Controller] ── (Định tuyến & tài liệu hóa Swagger với @SwaggerDoc)
  │
  ▼
[Service] ── (Nghiệp vụ, kiểm tra ràng buộc & ném AppError nếu vi phạm)
  │
  ▼
[Repository] ── (QueryBuilder, phân trang skip/take, lọc đa trường & sắp xếp)
  │
  ▼
[Database] ── (PostgreSQL / Neon Cloud qua TypeORM BaseEntity)
  │
  ▼
[Mapper] ── (Chuyển đổi Entity sang Response DTO - không rò rỉ Entity)
  │
  ▼
[ResponseInterceptor] ── (Bọc chuẩn ApiResponse { success, statusCode, message, data, timestamp })
  │
  ▼
Client
```

---

## 2. Cấu trúc thư mục chuẩn

```text
finora_be/
├── docs/                           # Tài liệu hướng dẫn phát triển
│   ├── module-development-guide.md # Hướng dẫn viết module hoàn chỉnh chuẩn Clean Architecture
│   └── testing-guide.md            # Hướng dẫn viết Unit Test (Controller, Service, Repository)
├── src/
│   ├── config/                     # Quản lý & xác thực biến môi trường
│   │   ├── app.config.ts           # Cấu hình PORT, CORS, URL
│   │   ├── database.config.ts      # Cấu hình DATABASE_URL
│   │   └── validation.schema.ts    # Validate env lúc bootstrap
│   ├── database/                   # TypeORM CLI DataSource cho migration
│   │   └── data-source.ts
│   ├── shared/database/            # TypeORM Module gốc (hỗ trợ SSL cloud/neon)
│   │   └── database.module.ts
│   ├── common/                     # Tầng dùng chung toàn hệ thống
│   │   ├── entities/base.entity.ts # BaseEntity: id (uuid), created_at, updated_at, deleted_at
│   │   ├── enums/sort-order.enum.ts# SortOrder: ASC / DESC
│   │   ├── errors/app.error.ts     # Base AppError, ErrorCodes, helper notFound()
│   │   ├── filters/                # HttpExceptionFilter & TypeOrmExceptionFilter
│   │   ├── interceptors/           # ResponseInterceptor chuẩn hóa JSON response
│   │   ├── response/api-response.ts# ApiResponse & PaginatedResponse
│   │   └── swagger/swagger-doc.ts  # Decorator @SwaggerDoc tổng hợp
│   ├── modules/
│   │   └── products/               # ★ MODULE MẪU (FULL CRUD + FILTER + SORT + PAGINATION)
│   │       ├── products.module.ts
│   │       ├── products.controller.ts
│   │       ├── products.service.ts
│   │       ├── products.constant.ts
│   │       ├── entities/product.entity.ts
│   │       ├── repository/product.repository.ts
│   │       ├── mapper/product.mapper.ts
│   │       ├── exceptions/product.exception.ts
│   │       └── dto/
│   │           ├── request/create-product.dto.ts
│   │           ├── request/update-product.dto.ts
│   │           ├── request/product-query.dto.ts
│   │           └── response/product.dto.ts
│   ├── app.module.ts               # Root Module
│   └── main.ts                     # Entry point
├── test/                           # Thư mục kiểm thử (Unit Tests)
│   └── products/                   # Unit test cho Products Module
│       ├── products.controller.spec.ts
│       ├── products.service.spec.ts
│       └── products.repository.spec.ts
├── .env.example
├── jest.config.ts                  # Cấu hình Jest (roots: test/)
├── package.json
└── tsconfig.json
```

---

## 3. Module Mẫu `products`

Module `products` cung cấp đầy đủ 5 endpoint chuẩn RESTful:

| Method   | Endpoint                  | HTTP Status | Mô tả                                                     |
| :------- | :------------------------ | :---------- | :-------------------------------------------------------- |
| `POST`   | `/api/v1/products`        | `201`       | Tạo sản phẩm mới (tự kiểm tra trùng SKU)                  |
| `GET`    | `/api/v1/products`        | `200`       | Danh sách sản phẩm (Phân trang, Lọc đa trường, Sắp xếp)  |
| `GET`    | `/api/v1/products/:id`    | `200`       | Chi tiết sản phẩm theo UUID                               |
| `PATCH`  | `/api/v1/products/:id`    | `200`       | Cập nhật thông tin (kiểm tra trùng SKU nếu thay đổi)       |
| `DELETE` | `/api/v1/products/:id`    | `204`       | Xóa mềm sản phẩm (`softDelete`)                           |

### Tham số Query tại `GET /api/v1/products`:

* `page` (number, default: 1)
* `limit` (number, default: 10, max: 100)
* `keyword` (string): Tìm kiếm mờ (`ILIKE`) trên `name`, `sku` hoặc `description`
* `category` (string): Lọc chính xác theo ngành hàng / danh mục
* `status` (enum: `DRAFT`, `ACTIVE`, `ARCHIVED`)
* `minPrice` & `maxPrice` (number): Lọc theo khoảng giá
* `isAvailable` (boolean): Lọc theo trạng thái mở bán
* `sortBy` (string, default: `createdAt`): Các trường hỗ trợ (`name`, `price`, `stock`, `createdAt`, `updatedAt`)
* `sortOrder` (enum, default: `DESC`): `ASC` hoặc `DESC`

---

## 4. Cài đặt & Khởi chạy

```bash
# 1. Di chuyển vào thư mục dự án
cd finora_be

# 2. Cài đặt dependencies
npm install

# 3. Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa DATABASE_URL trỏ tới PostgreSQL của bạn (VD: Neon Cloud)

# 4. Khởi chạy ở chế độ dev
npm run start:dev
```

* **API URL**: `http://localhost:3000/api/v1`
* **Swagger API Docs**: `http://localhost:3000/docs`

---

## 5. Kiểm thử (Unit Tests)

Dự án sử dụng Jest và NestJS Testing Module để thực hiện unit test:

```bash
# Chạy toàn bộ test
npm run test

# Chạy test và theo dõi thay đổi (watch mode)
npm run test:watch

# Chạy test và đo lường độ bao phủ (coverage)
npm run test:cov
```

---

## 6. Tài liệu Hướng dẫn Phát triển

* 📘 [Hướng dẫn Xây dựng Module Hoàn chỉnh](docs/module-development-guide.md): Quy trình 8 bước chuẩn Clean Architecture, DTO, TypeORM Entity, QueryBuilder, Mapper, Swagger Doc.
* 🧪 [Hướng dẫn Viết Unit Test Toàn diện](docs/testing-guide.md): Hướng dẫn cô lập và mock test 3 tầng (Controller, Service, Repository), mẹo debug và đo lường độ bao phủ coverage.


