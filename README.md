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
│   ├── git-and-module-development-guide.md # Hướng dẫn Git workflow, đặt tên & code module hoàn chỉnh
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

| Method   | Endpoint               | HTTP Status | Mô tả                                                   |
| :------- | :--------------------- | :---------- | :------------------------------------------------------ |
| `POST`   | `/api/v1/products`     | `201`       | Tạo sản phẩm mới (tự kiểm tra trùng SKU)                |
| `GET`    | `/api/v1/products`     | `200`       | Danh sách sản phẩm (Phân trang, Lọc đa trường, Sắp xếp) |
| `GET`    | `/api/v1/products/:id` | `200`       | Chi tiết sản phẩm theo UUID                             |
| `PATCH`  | `/api/v1/products/:id` | `200`       | Cập nhật thông tin (kiểm tra trùng SKU nếu thay đổi)    |
| `DELETE` | `/api/v1/products/:id` | `204`       | Xóa mềm sản phẩm (`softDelete`)                         |

### Tham số Query tại `GET /api/v1/products`:

- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `keyword` (string): Tìm kiếm mờ (`ILIKE`) trên `name`, `sku` hoặc `description`
- `category` (string): Lọc chính xác theo ngành hàng / danh mục
- `status` (enum: `DRAFT`, `ACTIVE`, `ARCHIVED`)
- `minPrice` & `maxPrice` (number): Lọc theo khoảng giá
- `isAvailable` (boolean): Lọc theo trạng thái mở bán
- `sortBy` (string, default: `createdAt`): Các trường hỗ trợ (`name`, `price`, `stock`, `createdAt`, `updatedAt`)
- `sortOrder` (enum, default: `DESC`): `ASC` hoặc `DESC`

---

## 3.1. Module Ngân sách (`budgets`)

Ngân sách được thiết lập theo ví và danh mục chi tiêu (`EXPENSE`), hỗ trợ chu kỳ
`WEEKLY`, `MONTHLY` và `YEARLY`. `startDate` là ngày bắt đầu chính xác của chu kỳ
đầu tiên; các chu kỳ tiếp theo bắt đầu sau ngày kết thúc và căn theo lịch tuần,
tháng hoặc năm. Scheduler kiểm tra và tạo chu kỳ đến hạn mỗi ngày lúc 00:00 UTC;
API reset cho phép bắt đầu kỳ mới ngay trong ngày và lặp lại an toàn nếu kỳ đã
được reset trong ngày. Tiến độ được lưu trong `budget_periods`, gồm số đã chi,
hạn mức cộng dồn và cờ chống gửi lặp cảnh báo.

| Method   | Endpoint                           | Mô tả                                             |
| :------- | :--------------------------------- | :------------------------------------------------ |
| `POST`   | `/api/v1/budgets`                  | Tạo ngân sách và chu kỳ đầu tiên                  |
| `GET`    | `/api/v1/budgets`                  | Danh sách ngân sách theo ví/danh mục/chu kỳ       |
| `GET`    | `/api/v1/budgets/:id`              | Chi tiết và lịch sử chu kỳ                        |
| `GET`    | `/api/v1/budgets/:id/status`       | Tiến độ, số dư còn lại và gợi ý chi tiêu mỗi ngày |
| `PUT`    | `/api/v1/budgets/:id`              | Cập nhật hạn mức, chu kỳ hoặc rollover            |
| `POST`   | `/api/v1/budgets/:id/reset-period` | Chủ động đóng chu kỳ và bắt đầu chu kỳ mới        |
| `DELETE` | `/api/v1/budgets/:id`              | Xóa mềm ngân sách                                 |

Giao dịch chi tiêu được đồng bộ trong cùng database transaction khi tạo, sửa
hoặc xóa. Cảnh báo realtime dùng các loại notification `BUDGET_WARNING` và
`BUDGET_EXCEEDED` có sẵn, gửi đến thành viên đã chấp nhận tham gia ví. Áp dụng
thay đổi schema và quyền động bằng migration trước khi triển khai:
`npm run migration:run`.

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

- **API URL**: `http://localhost:3000/api/v1`
- **Swagger API Docs**: `http://localhost:3000/docs`

---

## 5. Quản lý Database & Migration (TypeORM)

Dự án áp dụng quy trình quản lý schema bằng Migration thủ công (đã tắt `synchronize` để đảm bảo an toàn dữ liệu):

```bash
# Tự động so sánh Entity với Database và tạo file migration mới
npm run migration:generate TenMigration

# Tạo file migration trống để viết raw SQL tùy biến
npm run migration:create TenMigration

# Chạy (áp dụng) các migration chưa thực thi vào Database bằng tay
npm run migration:run

# Hoàn tác (rollback) bản migration gần nhất
npm run migration:revert

# Kiểm tra trạng thái các bản migration ([X] đã chạy, [ ] chưa chạy)
npm run migration:show
```

---

## 6. Kiểm thử (Unit Tests)

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

## 7. Tài liệu Hướng dẫn Phát triển

- 🏛️ [Kiến Trúc Hệ Thống](docs/architecture.md): Tổng quan kiến trúc phân lớp Clean Architecture, sơ đồ luồng request và cấu trúc thư mục.
- 📋 [Quy Chuẩn Viết Code & Phản Hồi API](docs/coding-conventions.md): Quy ước đặt tên, chuẩn phản hồi JSON `ApiResponse`, format lỗi và quy tắc Clean Architecture.
- 🔄 [Quy Trình Phát Triển & Git Workflow](docs/development-workflow.md): Thiết lập môi trường, vòng đời phát triển, lệnh build/start và quy chuẩn commit.
- 🗄️ [Hướng Dẫn Quản Lý Database & Migration](docs/database-migration-guide.md): Hướng dẫn chi tiết tạo, kiểm tra, rollback và chạy migration TypeORM thủ công.
- 📘 [Hướng dẫn Xây dựng Module Hoàn chỉnh](docs/module-development-guide.md): Quy trình 8 bước chuẩn Clean Architecture, DTO, TypeORM Entity, QueryBuilder, Mapper, Swagger Doc.
- 🧪 [Hướng dẫn Viết Unit Test Toàn diện](docs/testing-guide.md): Hướng dẫn cô lập và mock test 3 tầng (Controller, Service, Repository), mẹo debug và đo lường độ bao phủ coverage.
