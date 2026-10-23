# KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN MODULE AUDIT LOGS

Tài liệu đặc tả chi tiết kiến trúc, nghiệp vụ, phân quyền dữ liệu và kế hoạch kỹ thuật xây dựng module **Audit Logs (Nhật ký Hoạt động)** cho hệ thống Backend của Finora.

---

## 1. Tổng quan Nghiệp vụ & Kiến trúc Cốt lõi

### 1.1. Mục tiêu
- **An toàn & Minh bạch (Security & Compliance):** Lưu vết toàn bộ các hành động nhạy cảm (đăng nhập, đổi mật khẩu, cập nhật hồ sơ, phân quyền).
- **Đối soát Dữ liệu Tài chính (Financial Auditing):** Cung cấp bằng chứng chi tiết khi có biến động số dư, giao dịch, hạn mức ngân sách hoặc cơ cấu thành viên ví chung.
- **Trải nghiệm Timeline & Diff View (UX):** Hỗ trợ xem dòng thời gian (Timeline) và đối chiếu chi tiết Trước/Sau (Before vs After) trực quan trên ứng dụng.

### 1.2. Phân loại Sự kiện Ghi log (Action & EntityType)

Hệ thống quy chuẩn các nhóm hành động cần ghi nhận vào bảng `audit_logs`:

| Nhóm nghiệp vụ | `entityType` | Các hành động (`action`) | Ý nghĩa nghiệp vụ |
|---|---|---|---|
| **Bảo mật & Tài khoản** | `USER` / `AUTH` | `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `PROFILE_UPDATE` | Giám sát an ninh đăng nhập & xác thực |
| **Tài chính: Giao dịch** | `TRANSACTION` | `CREATE`, `UPDATE`, `DELETE` | Lưu vết tạo, sửa số tiền/danh mục, xóa giao dịch thu/chi |
| **Tài chính: Điều chỉnh** | `ACCOUNT` | `ADJUST_BALANCE`, `ARCHIVE`, `UNARCHIVE`, `DELETE` | Đối soát số dư bị lệch, lưu trữ/xóa tài khoản |
| **Tài chính: Chuyển tiền** | `TRANSFER` | `CREATE`, `CANCEL` | Dòng tiền luân chuyển giữa các ví hoặc giữa các tài khoản |
| **Ví chung & Cộng tác** | `WALLET` / `WALLET_MEMBER` | `MEMBER_INVITE`, `MEMBER_ACCEPT`, `MEMBER_ROLE_CHANGE`, `MEMBER_REMOVE`, `WALLET_UPDATE`, `WALLET_DELETE` | Mọi biến động quyền hạn và nhân sự trong ví chung |
| **Vay / Nợ** | `LOAN` / `LOAN_PAYMENT` | `CREATE`, `UPDATE`, `RECORD_PAYMENT`, `UNLINK_COUNTERPARTY`, `DELETE` | Lịch sử vay mượn và các đợt thanh toán nợ |
| **Ngân sách** | `BUDGET` | `CREATE`, `UPDATE_LIMIT`, `ROLLOVER_EXECUTE`, `DELETE` | Biến động hạn mức chi tiêu định kỳ |

---

## 2. Thiết kế Cơ sở Dữ liệu & Entity (`AuditLog`)

### 2.1. Điểm Kiến trúc Then chốt: Bổ sung trường `wallet_id`
> [!IMPORTANT]
> **Giải quyết triệt để bài toán Phân quyền & Hiệu năng truy vấn:**
> - Toàn bộ các đối tượng tài chính (`TRANSACTION`, `ACCOUNT`, `BUDGET`, `WALLET_MEMBER`, `LOAN`) đều thuộc phạm vi một `wallet`.
> - Để phục vụ phân quyền: Người dùng cá nhân chỉ xem hoạt động của mình và các ví chung họ tham gia; Chủ ví (Wallet Owner) được xem toàn bộ biến động của mọi thành viên trong phạm vi ví.
> - Nếu không có `wallet_id` trên `audit_logs`, hệ thống buộc phải JOIN ngược hoặc truy vấn qua các bảng nghiệp vụ khác (rất chậm và mất vết khi entity đã bị xóa).
> - **Giải pháp:** Cột `wallet_id` (UUID, nullable, Indexed) được lưu trực tiếp trên bảng `audit_logs`. Với sự kiện bảo mật/tài khoản (`USER`, `AUTH`) $\rightarrow$ `wallet_id = null`.

### 2.2. Schema Bảng `audit_logs`

```sql
CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
    "wallet_id" UUID NULL, -- Chỉ mục tối ưu phân quyền ví & hiệu năng
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NULL,
    "ip_address" VARCHAR(45) NULL,
    "user_agent" TEXT NULL,
    "old_value" JSONB NULL,
    "new_value" JSONB NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
CREATE INDEX "idx_audit_logs_wallet_id" ON "audit_logs" ("wallet_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX "idx_audit_logs_entity_type" ON "audit_logs" ("entity_type");
CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs" ("entity_id");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at" DESC);
```

---

## 3. Cơ chế Phân quyền Truy cập (Privacy & Authorization Architecture)

Hệ thống kết hợp **2 cấp độ phân quyền** chặt chẽ:
1. **Cấp 1: Quyền Hệ thống (System RBAC - Controller Level):** Kiểm tra qua `PermissionsGuard` & Decorator `@Permissions(...)`.
2. **Cấp 2: Phân quyền Dữ liệu Nghiệp vụ (Data Scoping - Service Query Level):** Lọc dữ liệu theo ngữ cảnh vai trò (Personal User vs Wallet Owner vs Admin).

### 3.1. Ma trận Quyền hạn theo Vai trò

| Vai trò người dùng | Cấp quyền Hệ thống (Permissions) | Phạm vi Dữ liệu được xem (Data Scoping Condition) | Mục đích & Giới hạn Bảo mật |
|---|---|---|---|
| **Người dùng cá nhân (Personal User)** | `AUDIT_LOGS_READ` | `(user_id = :currentUserId AND wallet_id IS NULL)`<br>Hoặc `wallet_id IN (:userWalletIds)` | Xem nhật ký đăng nhập, đổi pass của chính mình và log ví mình tham gia. **Tuyệt đối không thấy log tài khoản người khác**. |
| **Chủ ví (Wallet Owner)** | `AUDIT_LOGS_READ` | `wallet_id = :walletId` (với ví mình sở hữu `role = OWNER`) | Xem **toàn bộ** nhật ký biến động của tất cả thành viên phát sinh trong ví đó. |
| **Quản trị viên (Admin / SysAdmin)** | `SYSTEM_AUDIT_VIEW` / `isSysAdmin = true` | `wallet_id IS NULL AND entity_type IN ('USER', 'AUTH')` | Giám sát an ninh hệ thống (đăng ký, đăng nhập, đổi pass). **Không được xem giao dịch, số dư, hay ví tài chính của người dùng** (Bảo vệ quyền riêng tư). |

### 3.2. Cập nhật Permission trong Hệ thống
- Thêm `AUDIT_LOGS_READ` và `AUDIT_LOGS_EXPORT` vào `SYSTEM_PERMISSIONS` tại [permission.constant.ts](file:///e:/Android/Finora/finora_backend/src/common/constants/permission.constant.ts).
- Viết migration gán quyền `AUDIT_LOGS_READ` và `AUDIT_LOGS_EXPORT` cho Role `USER` (mặc định) và Role `ADMIN`.
- Nhờ đó, người dùng thông thường vượt qua `PermissionsGuard` hợp lệ, sau đó Service sẽ lọc đúng dữ liệu thuộc quyền sở hữu của họ.

---

## 4. Cơ chế Kỹ thuật: Ghi Log Bất đồng bộ Không chặn (Non-blocking)

> [!TIP]
> **Nguyên tắc Hiệu năng (Performance Principle):**
> Ghi log tuyệt đối không được làm chậm (block) thời gian phản hồi của các request giao dịch nghiệp vụ chính. Nếu DB ghi log gặp trục trặc, **không bao giờ** được làm rollback giao dịch tài chính chính của người dùng.

### Phương thức `AuditLogsService.recordLog`
```typescript
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly auditLogRepo: AuditLogRepository) {}

  /**
   * [CROSS-MODULE] Ghi nhận audit log an toàn, bất đồng bộ ngầm.
   * Lỗi nội bộ trong quá trình ghi log được bắt trọn để bảo vệ giao dịch chính.
   */
  async recordLog(dto: CreateAuditLogDto): Promise<void> {
    setImmediate(async () => {
      try {
        const log = this.auditLogRepo.create({
          userId: dto.userId,
          walletId: dto.walletId,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          oldValue: dto.oldValue ? JSON.parse(JSON.stringify(dto.oldValue)) : null,
          newValue: dto.newValue ? JSON.parse(JSON.stringify(dto.newValue)) : null,
        });

        await this.auditLogRepo.save(log);
      } catch (error) {
        this.logger.error(
          `[AuditLog] Ghi log thất bại cho Entity ${dto.entityType}:${dto.entityId}: ${error.message}`,
          error.stack,
        );
      }
    });
  }
}
```

---

## 5. Chi tiết Đặc tả 4 REST APIs

```
[Màn hình Lịch sử Hoạt động / Audit Log] ──► 1. GET  /api/v1/audit-logs (Lọc, tìm kiếm, phân trang)
  ├── Nút "Xuất file báo cáo" ──────────────► 2. GET  /api/v1/audit-logs/export (Xuất CSV/Excel)
  └── Nút "Xem chi tiết bản ghi" ──────────► 3. GET  /api/v1/audit-logs/:id (So sánh diff trước/sau)
                                                 │
[Màn hình Chi tiết Giao dịch / Ví / Khoản nợ]
  └── Tab "Lịch sử biến động đối tượng" ────► 4. GET  /api/v1/audit-logs/entities/:entityType/:entityId
```

---

### 5.1. API 1: `GET /api/v1/audit-logs` — Danh sách Lịch sử Hoạt động (Timeline)

- **Mô tả nghiệp vụ:** Truy vấn danh sách nhật ký kiểm toán với các bộ lọc linh hoạt (thời gian, loại hành động, loại đối tượng, người thực hiện). Dữ liệu trả về ở định dạng tinh gọn tối ưu cho hiển thị danh sách dạng Timeline.
- **Ngữ cảnh UI:**
  - Màn hình "Lịch sử hoạt động" trong Cài đặt bảo mật cá nhân.
  - Tab "Nhật ký ví" trong màn hình Quản lý Ví chung (Shared Wallet).
- **Xác thực & Quyền:** Yêu cầu Bearer Token (`JwtAuthGuard` & `@Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)`).

#### Input Specification (`AuditLogQueryDto`)
| Tham số | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `walletId` | UUID | Không | - | Lọc log thuộc phạm vi một ví chung cụ thể |
| `entityType` | String | Không | - | Lọc theo loại đối tượng (`TRANSACTION`, `ACCOUNT`, `WALLET_MEMBER`...) |
| `action` | String | Không | - | Lọc theo hành động (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`...) |
| `startDate` | Date String (ISO 8601) | Không | - | Ngày bắt đầu (ví dụ: `2026-10-01`) |
| `endDate` | Date String (ISO 8601) | Không | - | Ngày kết thúc (ví dụ: `2026-10-31`) |
| `page` | Number | Không | 1 | Trang hiện tại (tối thiểu 1) |
| `limit` | Number | Không | 20 | Số lượng mục trên 1 trang (1 - 100) |

#### Logic Xử lý Step-by-Step
1. Xác thực người dùng qua JWT.
2. Kiểm tra phân quyền:
   - **Trường hợp 1 (Có truyền `walletId`):**
     - Gọi `walletsService.getMemberRole(walletId, userId)`.
     - Nếu không thuộc ví $\rightarrow$ Ném `WalletAccessDeniedException` (403).
     - Nếu là `OWNER`: Được xem toàn bộ log của tất cả thành viên trong ví (`audit_log.wallet_id = :walletId`).
     - Nếu là `EDITOR` hoặc `VIEWER`: Được xem log biến động của ví đó.
   - **Trường hợp 2 (Không truyền `walletId`):**
     - Nếu là **Admin** (`isSysAdmin = true` hoặc có `SYSTEM_AUDIT_VIEW`): Xem log hệ thống/tài khoản (`audit_log.wallet_id IS NULL AND audit_log.entity_type IN ('USER', 'AUTH')`).
     - Nếu là **Người dùng thông thường:** Lấy danh sách ví user tham gia qua `walletsService.getUserWalletIds(userId)`. Điều kiện query: `(audit_log.user_id = :userId AND audit_log.wallet_id IS NULL) OR audit_log.wallet_id IN (:userWalletIds)`.
3. Xây dựng truy vấn TypeORM `QueryBuilder`:
   - SELECT: `id`, `userId`, `action`, `entityType`, `entityId`, `ipAddress`, `createdAt`, `oldValue`, `newValue`.
   - LEFT JOIN với bảng `users` để lấy: `user.fullName` (gán vào `userName`), `user.avatar` (gán vào `userAvatar`).
   - Sắp xếp: `createdAt DESC`. Phân trang: `.skip((page - 1) * limit).take(limit)`.
4. Sinh chuỗi `summary` tiếng Việt qua helper `AuditSummaryUtil`.
5. Trả về chuẩn `PaginatedResponse.of(items, total, page, limit)`.

#### Output Specification (HTTP 200 OK)
```json
{
  "items": [
    {
      "id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "userName": "Hoàng Văn Minh",
      "userAvatar": "https://cdn.finora.app/avatars/minh.jpg",
      "action": "UPDATE",
      "entityType": "TRANSACTION",
      "entityId": "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
      "summary": "Đã cập nhật số tiền giao dịch từ 200.000₫ thành 500.000₫",
      "ipAddress": "14.232.208.55",
      "createdAt": "2026-10-18T10:15:30.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 5.2. API 2: `GET /api/v1/audit-logs/:id` — Xem Chi Tiết 1 Bản Ghi (Diff View)

- **Mô tả nghiệp vụ:** Lấy toàn bộ thông tin chi tiết của một bản ghi audit log, bao gồm giá trị trước khi sửa (`oldValue`) và giá trị sau khi sửa (`newValue`), phục vụ hiển thị màn hình đối chiếu thay đổi (Before vs After).
- **Ngữ cảnh UI:** Khi người dùng nhấn vào 1 dòng trong danh sách lịch sử để xem chi tiết: *"Ai đã sửa cái gì, thay đổi từ giá trị nào sang giá trị nào"*.
- **Xác thực & Quyền:** Yêu cầu Bearer Token (`JwtAuthGuard` & `@Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)`).

#### Logic Xử lý Step-by-Step
1. Tìm kiếm bản ghi trong bảng `audit_logs` theo `id` kèm quan hệ `user`.
2. Nếu không tìm thấy $\rightarrow$ Ném `AuditLogNotFoundException` (404).
3. Kiểm tra quyền xem:
   - Nếu `log.userId === currentUser.id` $\rightarrow$ Cho phép xem.
   - Nếu log có `walletId != null`: Gọi `walletsService.getMemberRole(log.walletId, currentUser.id)`. Nếu là thành viên (Owner/Editor/Viewer) $\rightarrow$ Cho phép xem.
   - Nếu là Admin (`isSysAdmin = true` hoặc có `SYSTEM_AUDIT_VIEW`) và `log.walletId == null` (log tài khoản) $\rightarrow$ Cho phép xem.
   - Nếu vi phạm $\rightarrow$ Ném `AuditLogAccessDeniedException` (403).
4. Tính toán danh sách các trường bị thay đổi (**Changed Fields Diff Engine**):
   - So sánh từng key trong `oldValue` và `newValue`.
   - Tạo danh sách diff: `[{ field, from, to }]`.
5. Trả về `AuditLogDetailResponseDto`.

#### Output Specification (HTTP 200 OK)
```json
{
  "id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userName": "Hoàng Văn Minh",
  "action": "UPDATE",
  "entityType": "TRANSACTION",
  "entityId": "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
  "ipAddress": "14.232.208.55",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
  "oldValue": {
    "amount": 200000,
    "categoryId": "cat-food-01",
    "note": "Ăn trưa bún chả"
  },
  "newValue": {
    "amount": 500000,
    "categoryId": "cat-food-01",
    "note": "Ăn trưa liên hoan nhóm (Minh bù thêm tiền)"
  },
  "diff": [
    {
      "field": "amount",
      "from": 200000,
      "to": 500000
    },
    {
      "field": "note",
      "from": "Ăn trưa bún chả",
      "to": "Ăn trưa liên hoan nhóm (Minh bù thêm tiền)"
    }
  ],
  "createdAt": "2026-10-18T10:15:30.000Z"
}
```

---

### 5.3. API 3: `GET /api/v1/audit-logs/entities/:entityType/:entityId` — Lịch Sử Biến Động Riêng của 1 Đối Tượng

- **Mô tả nghiệp vụ:** Lấy toàn bộ dòng thời gian (Timeline) các lần tạo, sửa, đổi trạng thái của duy nhất một đối tượng cụ thể (ví dụ: xem toàn bộ lịch sử các lần sửa của Giao dịch #123).
- **Ngữ cảnh UI:** Tab "Lịch sử chỉnh sửa" nằm bên trong màn hình Chi tiết Giao dịch hoặc Chi tiết Khoản nợ.
- **Xác thực & Quyền:** Yêu cầu Bearer Token (`JwtAuthGuard` & `@Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)`).

#### Logic Xử lý Step-by-Step
1. Kiểm tra quyền truy cập của người dùng trên đối tượng `entityId` tương ứng.
2. Truy vấn bảng `audit_logs` với điều kiện `entityType = :entityType AND entityId = :entityId`, kèm quan hệ `user`.
3. Sắp xếp theo `createdAt DESC` (mới nhất lên trước).
4. Ánh xạ các bản ghi thành danh sách Timeline: `id`, `action`, `actorName`, `description`, `createdAt`.
5. Trả về đối tượng `EntityTimelineResponseDto`.

#### Output Specification (HTTP 200 OK)
```json
{
  "entityType": "TRANSACTION",
  "entityId": "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
  "timeline": [
    {
      "id": "log-02",
      "action": "UPDATE",
      "actorName": "Hoàng Văn Minh",
      "description": "Thay đổi số tiền từ 200.000₫ sang 500.000₫",
      "createdAt": "2026-10-18T10:15:30.000Z"
    },
    {
      "id": "log-01",
      "action": "CREATE",
      "actorName": "Nguyễn Thị An",
      "description": "Tạo mới giao dịch với số tiền 200.000₫",
      "createdAt": "2026-10-18T09:00:00.000Z"
    }
  ]
}
```

---

### 5.4. API 4: `GET /api/v1/audit-logs/export` — Xuất Báo Cáo (CSV/Excel)

- **Mô tả nghiệp vụ:** Xuất dữ liệu nhật ký kiểm toán ra file CSV hoặc Excel theo khoảng thời gian và tiêu chí lọc.
- **Ngữ cảnh UI:** Nút "Xuất file báo cáo" trên màn hình Lịch sử Hoạt động.
- **Xác thực & Quyền:** Yêu cầu Bearer Token (`JwtAuthGuard` & `@Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_EXPORT)`).

#### Xử lý Ràng buộc & Ngoại lệ
1. Nếu `format` không thuộc `['csv', 'xlsx']` $\rightarrow$ Ném `InvalidExportFormatException` (400).
2. Nếu `(endDate - startDate) > 90 ngày` hoặc `endDate < startDate` $\rightarrow$ Ném `ExportDateRangeExceededException` (400).
3. Áp dụng chuẩn Scoping như API 1 (người dùng chỉ xuất dữ liệu mình có quyền xem).
4. **Định dạng CSV:** Đính kèm UTF-8 BOM (`\uFEFF`) để Excel hiển thị tiếng Việt có dấu chuẩn đẹp.
5. Header trả về: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="audit_logs_YYYYMMDD_HHmmss.csv"`.

---

## 6. Bảng Tổng hợp Ngoại lệ Nghiệp vụ (Exceptions)

Được tạo tại thư mục `src/modules/audit-logs/exceptions/`, kế thừa từ [AppError](file:///e:/Android/Finora/finora_backend/src/common/errors/app.error.ts):

| Exception Class | Mã HTTP | Error Code | Thông báo hiển thị (Message) | Khi nào kích hoạt |
|---|---|---|---|---|
| `AuditLogNotFoundException` | `404` | `AUDIT_LOG_NOT_FOUND` | "Không tìm thấy bản ghi nhật ký hoạt động" | `id` log không tồn tại trong hệ thống |
| `AuditLogAccessDeniedException` | `403` | `AUDIT_LOG_ACCESS_DENIED` | "Bạn không có quyền xem nhật ký hoạt động này" | Cố gắng xem log của ví hoặc của user khác khi không có thẩm quyền |
| `ExportDateRangeExceededException` | `400` | `EXPORT_DATE_RANGE_EXCEEDED` | "Khoảng thời gian xuất dữ liệu tối đa là 90 ngày" | `(endDate - startDate) > 90` ngày |
| `InvalidExportFormatException` | `400` | `INVALID_EXPORT_FORMAT` | "Định dạng xuất file phải là csv hoặc xlsx" | Tham số `format` truyền lên không hợp lệ |
| `WalletAccessDeniedException` | `403` | `WALLET_ACCESS_DENIED` | "Bạn không có quyền thực hiện thao tác trên ví này" | Truyền `walletId` mà user không phải là thành viên |

---

## 7. Hướng dẫn Tích hợp Liên Module (Cross-Module Integration)

Để các module khác (Transactions, Accounts, Wallets, Budgets, Loans, Auth) ghi log dễ dàng mà không làm rối code nghiệp vụ, `AuditLogsModule` chỉ `exports: [AuditLogsService]`.

### Code mẫu tích hợp:

```typescript
// Trong TransactionsService khi cập nhật giao dịch
await this.auditLogsService.recordLog({
  userId: currentUser.id,
  walletId: tx.walletId, // Gắn ID ví để tự động phân quyền truy cập
  action: AUDIT_LOG_ACTION.UPDATE,
  entityType: AUDIT_LOG_ENTITY_TYPE.TRANSACTION,
  entityId: tx.id,
  oldValue: {
    amount: oldTx.amount,
    note: oldTx.note,
    categoryId: oldTx.categoryId,
  },
  newValue: {
    amount: newTx.amount,
    note: newTx.note,
    categoryId: newTx.categoryId,
  },
  ipAddress: clientContext.ipAddress,
  userAgent: clientContext.userAgent,
});
```

---

## 8. Cấu trúc Thư mục Module khi Hoàn thiện

```
src/modules/audit-logs/
├── audit-logs.module.ts            # @Module, TypeOrmModule.forFeature, exports: [AuditLogsService]
├── audit-logs.controller.ts        # Triển khai 4 APIs, @Permissions, @SwaggerDoc
├── audit-logs.service.ts           # Business logic, recordLog non-blocking, diff engine, timeline
├── audit-logs.constant.ts          # Action, EntityType, Constants, ErrorCodes
├── entities/
│   └── audit-log.entity.ts         # TypeORM Entity (bổ sung cột walletId)
├── repositories/
│   └── audit-log.repository.ts     # QueryBuilder có phân trang, lọc ngày, lọc ví, join User
├── mapper/
│   └── audit-log.mapper.ts         # Chuyển đổi Entity -> DTO, tính toán Diff & Timeline
├── exceptions/
│   ├── audit-log-not-found.exception.ts
│   ├── audit-log-access-denied.exception.ts
│   ├── export-date-range-exceeded.exception.ts
│   └── invalid-export-format.exception.ts
├── dto/
│   ├── request/
│   │   ├── create-audit-log.dto.ts
│   │   ├── audit-log-query.dto.ts
│   │   └── export-audit-log.dto.ts
│   └── response/
│       ├── audit-log-response.dto.ts
│       ├── audit-log-detail-response.dto.ts
│       └── entity-timeline-response.dto.ts
└── utils/
    ├── audit-export.util.ts        # Helper xuất CSV (UTF-8 BOM) & Excel
    └── audit-summary.util.ts       # Helper tự động sinh chuỗi tóm tắt hành động tiếng Việt
```

---

## 9. Lộ trình Triển khai Chi tiết 5 Bước (Implementation Roadmap)

1. **Bước 1 — Schema, Permission Constants & Migration:**
   - Cập nhật [audit-log.entity.ts](file:///e:/Android/Finora/finora_backend/src/modules/audit-logs/entities/audit-log.entity.ts) bổ sung `wallet_id` (UUID, nullable, Indexed).
   - Thêm `AUDIT_LOGS_READ`, `AUDIT_LOGS_EXPORT` vào [permission.constant.ts](file:///e:/Android/Finora/finora_backend/src/common/constants/permission.constant.ts).
   - Tạo migration TypeORM cho bảng `audit_logs` cùng đầy đủ các chỉ mục tìm kiếm và seed quyền cho roles.
2. **Bước 2 — Constants, Exceptions & DTOs:**
   - Định nghĩa `audit-logs.constant.ts` (Actions, EntityTypes, ErrorCodes).
   - Tạo 4 exception classes kế thừa `AppError`.
   - Tạo request/response DTOs: `CreateAuditLogDto`, `AuditLogQueryDto`, `ExportAuditLogDto`, `AuditLogTimelineItemDto`, `AuditLogDetailResponseDto`, `EntityTimelineResponseDto`.
3. **Bước 3 — Helper Utils, Repository & Mapper:**
   - Xây dựng `audit-summary.util.ts` để sinh tóm tắt tiếng Việt và tính toán `diff: [{ field, from, to }]`.
   - Xây dựng `audit-export.util.ts` để xuất file CSV (UTF-8 BOM) và Excel.
   - Xây dựng `AuditLogRepository` với TypeORM QueryBuilder hỗ trợ JOIN `users`, lọc phân quyền an toàn theo ma trận quyền hạn (Personal / Wallet Owner / Admin).
   - Xây dựng `AuditLogMapper`.
4. **Bước 4 — Service Layer & Controller Layer:**
   - Xây dựng `AuditLogsService` với các hàm: `recordLog` (ngầm qua `setImmediate`), `getTimelineList`, `getDetailWithDiff`, `getEntityTimeline`, `exportLogs`.
   - Xây dựng `AuditLogsController` với 4 endpoints, tích hợp `@Permissions`, `@SwaggerDoc`, `@CurrentUser`, `@ClientContext`.
   - Đăng ký `AuditLogsModule` vào `app.module.ts`.
5. **Bước 5 — Verification & Tích hợp Mẫu:**
   - Chạy `npm run typecheck` & `npm run build` đảm bảo không có lỗi TypeScript.
   - Tích hợp gọi `recordLog` thử nghiệm tại [auth.service.ts](file:///e:/Android/Finora/finora_backend/src/modules/auth/auth.service.ts) (LOGIN) và [transactions.service.ts](file:///e:/Android/Finora/finora_backend/src/modules/transactions/transactions.service.ts) (UPDATE).
