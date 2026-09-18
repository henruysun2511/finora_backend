# Hướng Dẫn Quản Lý Database Migration (TypeORM)

Tài liệu này hướng dẫn quy trình tạo, kiểm tra và chạy database migration bằng tay (manual workflow) trong dự án **Finora Backend**.

---

## 1. Cơ Chế Hoạt Động & Cấu Hình

- **Package đã cài đặt**: `@nestjs/typeorm` (v10), `typeorm` (v0.3.20), `pg` (v8).
- **Trạng thái `synchronize`**: Đã được thiết lập thành **`false`** trong `DatabaseModule`. Việc này ngăn TypeORM tự động sửa bảng trực tiếp khi ứng dụng chạy, đảm bảo an toàn dữ liệu và toàn quyền kiểm soát qua migration.
- **DataSource CLI**: Tệp cấu hình tại [src/database/data-source.ts](file:///d:/antigravity/finora_backend/src/database/data-source.ts).
- **Thư mục chứa migration**: [src/database/migrations/](file:///d:/antigravity/finora_backend/src/database/migrations/).

---

## 2. Bảng Lệnh Quản Lý Migration Bằng Tay

Tất cả các lệnh được cấu hình sẵn trong `package.json`:

| Lệnh NPM | Chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| `npm run migration:generate <Tên>` | **Tự động đối soát & tạo migration** | So sánh các `@Entity` hiện tại với Database và tự động sinh code SQL up/down vào file migration mới. |
| `npm run migration:create <Tên>` | **Tạo file migration trống** | Tạo khung template migration để bạn tự viết câu lệnh SQL tùy biến (seed data, tạo trigger, index đặc biệt...). |
| `npm run migration:run` | **Chạy migration vào Database** | Thực thi tuần tự tất cả các migration còn thiếu vào database PostgreSQL. |
| `npm run migration:revert` | **Rollback migration gần nhất** | Hoàn tác lại bản migration được chạy gần nhất (gọi hàm `down()`). |
| `npm run migration:show` | **Kiểm tra trạng thái migration** | Liệt kê toàn bộ migration và trạng thái: `[X]` đã chạy, `[ ]` chưa chạy. |

> **Mẹo**: Nếu bạn chạy `npm run migration:generate` mà không truyền tên, script sẽ tự động tạo tên theo thời gian (ví dụ: `AutoMigration_20260918_143000`).

---

## 3. Quy Trình Chuẩn Khi Thay Đổi Cấu Trúc Bảng

Khi bạn tạo Module mới hoặc sửa đổi Entity (thêm cột, đổi kiểu dữ liệu, đánh index...):

### Bước 1: Khai báo / Cập nhật Entity trong code
Ví dụ bạn thêm cột `discountPrice` vào `Product` entity:
```typescript
@Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
discountPrice?: number;
```

### Bước 2: Tạo bản migration tương ứng
Chạy lệnh trong terminal:
```bash
npm run migration:generate AddDiscountPriceToProduct
```
TypeORM sẽ tự động so sánh entity với database Neon/Postgres và tạo file:
`src/database/migrations/178971xxxxxxx-AddDiscountPriceToProduct.ts`

### Bước 3: Kiểm tra nội dung file migration
Mở file vừa được sinh ra trong `src/database/migrations/` để rà soát:
- Hàm `up`: Chứa các lệnh thay đổi cần áp dụng.
- Hàm `down`: Chứa các lệnh hoàn tác (rollback) nếu cần.

### Bước 4: Chạy migration vào Database bằng tay
```bash
npm run migration:run
```
Console sẽ thông báo migration đã được thực thi thành công vào Database.

### Bước 5: Kiểm tra trạng thái
```bash
npm run migration:show
```
Bạn sẽ thấy bản migration mới đã có dấu tích `[X]`.

---

## 4. Xử Lý Các Trường Hợp Thường Gặp

### Khi nào thì migration:generate báo "No changes found"?
Khi cấu trúc các Entity trong mã nguồn đang hoàn toàn khớp với các bảng trong Database, TypeORM sẽ thông báo:
```text
No changes in database schema were found - cannot generate a migration.
```
Điều này có nghĩa là bạn chưa thay đổi entity nào, hoặc các thay đổi đã được áp dụng trước đó.

### Muốn quay lại trạng thái trước đó (Revert)
Nếu migration vừa chạy phát sinh lỗi hoặc muốn hủy bỏ:
```bash
npm run migration:revert
```

### Chạy trực tiếp qua TypeORM CLI gốc (nếu không dùng helper script)
```bash
# Generate
npx typeorm-ts-node-commonjs migration:generate src/database/migrations/MyMigration -d src/database/data-source.ts

# Run
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts

# Revert
npx typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts
```
