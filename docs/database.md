# Database Architecture & Migration Guide

Tài liệu chi tiết về tầng truy xuất cơ sở dữ liệu, thiết lập kết nối và quy trình quản lý Migration trong dự án **Finora Backend** (`finora_be`).

---

## 1. Tổng Quan CSDL

Dự án sử dụng **PostgreSQL** (lưu trữ trên nền tảng **Neon Cloud**) và được điều khiển qua **TypeORM 0.3**:

- **Database Engine:** PostgreSQL (hỗ trợ UUID v4 thông qua extension `uuid-ossp`).
- **ORM Framework:** TypeORM với phương pháp tiếp cận Code-First (khai báo thực thể qua TypeScript decorator).
- **Quản lý Schema:** 100% quản lý bằng Migration thủ công. Tham số `synchronize` được đặt thành `false` ở mọi môi trường để đảm bảo an toàn dữ liệu và tránh hiện tượng schema drift.
- **Connection Driver:** `pg` (node-postgres) với cấu hình bảo mật SSL phù hợp với cloud serverless.

---

## 2. Cấu Hình Kết Nối

### 2.1 Chuỗi Kết Nối (`DATABASE_URL`)

Ứng dụng kết nối tới Neon PostgreSQL thông qua biến môi trường duy nhất trong tệp `.env`:

```env
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"
```

### 2.2 Cấu Hình SSL

Neon PostgreSQL yêu cầu kết nối được mã hóa TLS/SSL. Trong [src/shared/database/database.module.ts](file:///d:/antigravity/finora_backend/src/shared/database/database.module.ts) và [src/database/data-source.ts](file:///d:/antigravity/finora_backend/src/database/data-source.ts), SSL được tự động nhận diện:

```typescript
const isSsl = DatabaseConfig.URL.includes('sslmode=require') || DatabaseConfig.URL.includes('neon.tech');

ssl: isSsl ? { rejectUnauthorized: false } : false
```

---

## 3. Quy Trình Làm Việc Với Entity & Migration

### Bước 1: Khai Báo / Cập Nhật Entity
Mọi entity nằm trong thư mục `src/modules/<feature>/entities/<feature>.entity.ts` và kế thừa từ `BaseEntity`:

```typescript
// src/modules/products/entities/product.entity.ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 200 })
  @Index()
  name: string;

  @Column({ unique: true, length: 100 })
  @Index()
  sku: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;
}
```

### Bước 2: Tự Động Đối Soát & Sinh Migration Bằng Tay
Chạy lệnh sau trong terminal:
```bash
npm run migration:generate TenMigration
```
> TypeORM sẽ đối soát entity với CSDL trên Neon và tự động sinh file SQL migration vào `src/database/migrations/<timestamp>-TenMigration.ts`.

### Bước 3: Rà Soát File Migration Vừa Sinh
Kiểm tra code SQL trong 2 hàm `up()` và `down()` để đảm bảo chính xác logic.

### Bước 4: Chạy Áp Dụng Migration Vào Database
```bash
npm run migration:run
```

### Bước 5: Hoàn Tác (Rollback) Nếu Cần
```bash
npm run migration:revert
```

---

## 4. Bảng Lệnh Tham Khảo

| Lệnh | Mô tả chức năng |
| :--- | :--- |
| `npm run migration:generate <Tên>` | Đối soát `@Entity` với Database và tự động tạo file migration mới |
| `npm run migration:create <Tên>` | Khởi tạo file migration trống để viết raw SQL thủ công |
| `npm run migration:run` | Áp dụng thủ công tất cả migration còn thiếu vào database |
| `npm run migration:revert` | Hoàn tác lại bản migration vừa chạy gần nhất |
| `npm run migration:show` | Xem danh sách trạng thái các migration (`[X]` đã chạy, `[ ]` chưa chạy) |

---

## 5. Các Thực Hành Tốt Nhất (Best Practices)

1. **Không bật `synchronize: true`:** Luôn để `synchronize: false`. Synchronize tự động có thể làm mất dữ liệu khi bảng bị drop hoặc đổi kiểu cột ngoài ý muốn.
2. **Tính Bất Biến Của Migration (Immutability):** Khi một migration đã được push lên branch chung / production, không được chỉnh sửa trực tiếp file đó. Luôn tạo một migration mới cho các thay đổi tiếp theo.
3. **Kế thừa BaseEntity:** Đảm bảo toàn bộ entity có sẵn `id` (UUID), `created_at`, `updated_at`, `deleted_at`.
