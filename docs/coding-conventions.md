# Coding Conventions

Tài liệu quy chuẩn phong cách lập trình (coding standards), quy tắc đặt tên và cấu trúc phản hồi API trong dự án **Finora Backend** (`finora_be`).

---

## 1. Nguyên Tắc Chung

- **TypeScript First:** Bắt buộc định kiểu nghiêm ngặt (Strict Typing). Tuyệt đối không dùng kiểu `any`; luôn sử dụng Interface, Type Alias, Class DTO hoặc Generic.
- **Clean Architecture & Separation of Concerns:**
  - Controller chỉ làm nhiệm vụ tiếp nhận HTTP request, validate qua DTO và chuyển tiếp cho Service.
  - Service chịu trách nhiệm xử lý toàn bộ logic nghiệp vụ (business logic) và kiểm tra ràng buộc.
  - Repository chịu trách nhiệm truy xuất cơ sở dữ liệu (QueryBuilder, filtering, pagination).
  - Mapper chịu trách nhiệm chuyển đổi Entity sang Response DTO (không để lộ cấu trúc Entity nội bộ ra ngoài Client).
- **Surgical Scope:** Giữ commit tập trung, không tự ý sửa đổi format/style của các file không liên quan đến tính năng đang làm.

---

## 2. Quy Tắc Đặt Tên (Naming Conventions)

### 2.1 Tập tin và Thư mục
- Đặt tên theo chuẩn **kebab-case** có hậu tố mô tả vai trò:
  - Controller: `products.controller.ts`
  - Service: `products.service.ts`
  - Repository: `product.repository.ts`
  - Entity: `product.entity.ts`
  - DTO: `create-product.dto.ts`, `product.dto.ts`
  - Exception: `product.exception.ts`
  - Mapper: `product.mapper.ts`
  - Module: `products.module.ts`

### 2.2 Thành phần trong Mã Nguồn
- **Classes, Interfaces, Enums:** Viết theo **PascalCase** (ví dụ: `ProductService`, `ProductStatus`, `ApiResponse`).
- **Variables, Functions, Methods:** Viết theo **camelCase** (ví dụ: `findWithPagination`, `isAvailable`, `minPrice`).
- **Constants & Enums Values:** Viết theo **UPPER_SNAKE_CASE** (ví dụ: `DEFAULT_PAGE_LIMIT`, `SortOrder.DESC`).
- **Tên bảng & Tên cột Database:** Viết theo **snake_case** (ví dụ: bảng `products`, cột `created_at`, `is_available`).

---

## 3. Quy Chuẩn Phản Hồi API (API Response Standards)

Toàn bộ response của Finora Backend được chuẩn hóa thông qua `ResponseInterceptor` và `HttpExceptionFilter`:

### 3.1 Phản Hồi Thành Công Đơn Lẻ (Single Object)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": {
    "id": "a2b3c4d5-...",
    "name": "Finora Premium",
    "price": 99.00
  },
  "timestamp": "2026-09-18T13:45:00.000Z"
}
```

### 3.2 Phản Hồi Danh Sách Có Phân Trang (Paginated Collection)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách thành công",
  "data": {
    "items": [
      { "id": "uuid-1", "name": "Item 1" },
      { "id": "uuid-2", "name": "Item 2" }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  },
  "timestamp": "2026-09-18T13:45:00.000Z"
}
```

### 3.3 Phản Hồi Lỗi Đồng Nhất (Error Format)
```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "errors": [
    {
      "field": "price",
      "message": "price must be a positive number"
    }
  ],
  "timestamp": "2026-09-18T13:45:00.000Z"
}
```

---

## 4. Quản Lý Entity & Cơ Sở Dữ Liệu

- Mọi Entity đều phải kế thừa từ [BaseEntity](file:///d:/antigravity/finora_backend/src/common/entities/base.entity.ts) để tự động có các trường chuẩn: `id` (UUID v4), `created_at`, `updated_at`, `deleted_at` (hỗ trợ Soft Delete).
- Sử dụng Transformer cho kiểu dữ liệu số thực (`decimal` / `numeric`) để tránh bị trả về dưới dạng string:
  ```typescript
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  price: number;
  ```
- **Tuyệt đối không bật `synchronize: true`**. Mọi thay đổi schema phải được quản lý qua migration thủ công:
  ```bash
  npm run migration:generate TenMigration
  npm run migration:run
  ```

---

## 5. Xử Lý Ngoại Lệ (Error Handling)

- Khởi tạo các Custom Exception kế thừa từ `AppError` hoặc `HttpException` phù hợp.
- Ví dụ:
  ```typescript
  export class ProductNotFoundException extends AppError {
    constructor(id: string) {
      super(
        `Không tìm thấy sản phẩm với ID: ${id}`,
        HttpStatus.NOT_FOUND,
        'PRODUCT_NOT_FOUND',
      );
    }
  }
  ```
- Tránh việc nuốt lỗi (empty `catch {}`) hoặc throw chuỗi String đơn thuần.

---

## 6. Tài Liệu Hóa API Với Swagger

Mỗi endpoint trong Controller cần được gắn decorator `@SwaggerDoc` tổng hợp để tự động hiển thị đầy đủ thông tin trên Swagger UI (`/docs`):

```typescript
@Get(':id')
@SwaggerDoc({
  summary: 'Chi tiết sản phẩm',
  description: 'Lấy thông tin chi tiết một sản phẩm theo UUID',
  responseType: ProductResponseDto,
  notFoundError: true,
})
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.productsService.findOne(id);
}
```