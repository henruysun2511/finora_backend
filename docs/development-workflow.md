# Development Workflow

Tài liệu chi tiết về quy trình phát triển, quy chuẩn commit và kiểm thử chất lượng mã nguồn cho dự án **Finora Backend** (`finora_be`).

---

## 1. Vòng Đời Phát Triển Tại Local (Local Development)

### 1.1 Khởi tạo Dự án & Cài đặt Dependencies

1. Sao chép biến môi trường từ file mẫu:
   ```bash
   cp .env.example .env
   ```
2. Cập nhật `DATABASE_URL` (ví dụ connection string tới Neon Cloud PostgreSQL) và các tham số `PORT`, `FRONTEND_URL`.
3. Cài đặt các thư viện:
   ```bash
   npm install
   ```

### 1.2 Khởi chạy Ứng dụng

- **Chế độ phát triển (Hot-reload / Watch mode):**
  ```bash
  npm run start:dev
  ```
- **Chế độ Debug:**
  ```bash
  npm run start:debug
  ```
- **Build kiểm tra mã nguồn (Production Build):**
  ```bash
  npm run build
  ```
- **Khởi chạy bản Build:**
  ```bash
  npm run start
  ```

- **Swagger API Documentation:** Mặc định chạy tại `http://localhost:3000/docs`

---

## 2. Quy Trình Làm Việc Với Database Migration

Dự án áp dụng quy trình kiểm soát schema bằng migration thủ công (đã tắt `synchronize: false`):

1. **Khi có thay đổi `@Entity`:**
   ```bash
   npm run migration:generate TenMigration
   ```
2. **Kiểm tra file migration** được sinh ra tại `src/database/migrations/`.
3. **Áp dụng vào Database:**
   ```bash
   npm run migration:run
   ```
4. **Kiểm tra trạng thái:**
   ```bash
   npm run migration:show
   ```

---

## 3. Kiểm Thử (Testing Workflow)

Trước khi commit hoặc tạo Pull Request, toàn bộ unit test phải pass:

```bash
# Chạy toàn bộ test suites
npm run test

# Chạy test theo dõi thay đổi liên tục (TDD)
npm run test:watch

# Đo lường độ bao phủ kiểm thử (Coverage)
npm run test:cov
```

---

## 4. Quy Chuẩn Git & Commit

### 4.1 Quy tắc Commit (Conventional Commits)

Sử dụng định dạng thông điệp commit ngắn gọn, rõ ràng theo cấu trúc `<type>: <description>`:

- `feat:` Thêm tính năng mới (ví dụ: `feat: add category filter to products endpoint`)
- `fix:` Sửa lỗi (ví dụ: `fix: resolve incorrect stock calculation in order service`)
- `refactor:` Tối ưu / tái cấu trúc mã nguồn nhưng không thay đổi hành vi nghiệp vụ
- `test:` Thêm hoặc cập nhật unit test
- `docs:` Cập nhật tài liệu kỹ thuật
- `chore:` Thay đổi cấu hình, dependencies, script build

### 4.2 Surgical Commits (Commit tập trung)

- Mỗi commit chỉ nên giải quyết một mục đích cụ thể.
- Tránh việc gộp các thay đổi formatting/refactor không liên quan vào cùng commit với tính năng mới.
- Luôn kiểm tra `git status` và `git diff` trước khi commit.