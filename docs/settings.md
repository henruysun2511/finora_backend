# Finora - Tài liệu Module Settings & Security (Cài đặt & Bảo mật)

> **Module**: `SettingsModule` (`src/modules/settings/`)  
> **Entity**: `Setting` (`src/modules/settings/entities/setting.entity.ts` -> bảng `user_settings`)  
> **Kiến trúc**: Clean Architecture (Controller -> Service -> Repository / Mapper / Redis Rate Limiter)  
> **Ngày cập nhật**: 20/10/2026  

---

## 1. Tổng quan Module

Module **Settings & Security** chịu trách nhiệm quản lý toàn bộ các tùy chọn cấu hình cá nhân của người dùng trên hệ thống Finora, bao gồm:
1. **Cài đặt chung (General Preferences)**: Tiền tệ mặc định, ngôn ngữ hiển thị, chế độ màu giao diện (Sáng/Tối/Hệ thống), chế độ che/ẩn số dư nhạy cảm, quyền riêng tư giao dịch.
2. **Cá nhân hóa AI Mascot (Mascot Personalization)**: Bật/tắt Mascot, tùy biến giọng điệu phản hồi của AI (Gentle / Balanced / Roast), và mức độ nhạy cảnh báo chi tiêu (All / Anomalies Only / Silent).
3. **Mô hình AI & API Key cá nhân (AI Model & BYOK - Bring Your Own Key)**: Tùy chọn nhà cung cấp AI (Google Gemini / OpenAI), model cụ thể (`gemini-1.5-flash`, `gpt-4o-mini`, v.v.), và cho phép người dùng nhập API Key cá nhân để không bị giới hạn quota. **Nếu người dùng không tự cài đặt, hệ thống tự động fallback dùng API Key mặc định của Finora trong `.env`**.
4. **Bảo mật ứng dụng (App Lock & PIN Security)**: Khóa ứng dụng bằng mã PIN 4-6 số được mã hóa bcrypt và cơ chế chống dò mã PIN (Rate-limiting Brute-Force lockout).
5. **Tùy chọn thông báo (Notification Preferences)**: Bật/tắt từng kênh thông báo đẩy qua cấu trúc JSONB linh hoạt.

---

## 2. Thiết kế Cơ sở Dữ liệu & Thực thể (`Setting`)

Bản ghi cài đặt được quản lý độc lập tại bảng `user_settings` với quan hệ **1 - 1** với thực thể `User`. Khi người dùng bị xóa (`CASCADE`), toàn bộ bản ghi cài đặt sẽ được dọn dẹp tương ứng.

### Cấu trúc Schema `user_settings`

| Trường | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | `uuid_generate_v4()` | Khóa chính của bản ghi cài đặt |
| `user_id` | `uuid` (FK, Unique, Indexed) | Không | Liên kết đến `users.id` |
| `default_currency` | `varchar(3)` | `'VND'` | Tiền tệ mặc định (VND, USD, EUR, JPY, ...) |
| `language` | `enum('vi', 'en')` | `'vi'` | Ngôn ngữ giao diện người dùng |
| `theme` | `enum('LIGHT', 'DARK', 'SYSTEM')` | `'SYSTEM'` | Chế độ giao diện (Sáng, Tối, Theo thiết bị) |
| `app_lock_enabled` | `boolean` | `false` | Trạng thái kích hoạt khóa ứng dụng |
| `pin_hash` | `varchar(255)` (Nullable, `select: false`) | `null` | Mã hash bcrypt của mã PIN (ẩn khỏi câu query mặc định) |
| `show_mascot` | `boolean` | `true` | Hiển thị linh vật AI trên trang chủ và màn hình tính năng |
| `current_mascot_tier_id`| `uuid` (Nullable) | `null` | Cấp độ linh vật hiện tại theo Net Worth |
| `mascot_tone` | `enum('GENTLE', 'BALANCED', 'ROAST')` | `'BALANCED'` | Giọng điệu của AI Mascot |
| `mascot_sensitivity` | `enum('ALL', 'ANOMALIES_ONLY', 'SILENT')` | `'ANOMALIES_ONLY'` | Độ nhạy cảnh báo chi tiêu của AI |
| `ai_provider` | `enum('GEMINI', 'OPENAI')` | `'GEMINI'` | Nhà cung cấp AI đang chọn |
| `ai_api_key` | `varchar(255)` (Nullable, `select: false`) | `null` | API Key riêng của người dùng (ẩn khỏi câu query mặc định) |
| `ai_model` | `varchar(100)` (Nullable) | `null` | Tên model AI tùy chỉnh (null = dùng model mặc định của hệ thống) |
| `default_transaction_visibility` | `enum('PUBLIC', 'FRIENDS', 'PRIVATE')` | `'PRIVATE'` | Quyền hiển thị giao dịch mặc định |
| `default_amount_hidden`| `boolean` | `true` | Ẩn số tiền trên dashboard khi mở app |
| `notification_preferences` | `jsonb` (Nullable) | `{}` | Cấu hình bật/tắt các loại thông báo |
| `created_at` / `updated_at` | `timestamptz` | `NOW()` | Dấu thời gian tạo / cập nhật |

---

## 3. Các Phân Hệ Tính Năng Chi Tiết

### 3.1. Cài đặt Cá nhân hóa AI Mascot

Cho phép người dùng tùy biến phong cách trò chuyện và mức độ can thiệp tài chính của Mascot:

* **Tone Giọng điệu (`MascotTone`)**:
  * `GENTLE` (Nhẹ nhàng, an ủi): Giọng điệu đồng cảm, khích lệ và không bao giờ phán xét khi người dùng chi tiêu quá đà.
  * `BALANCED` (Cân bằng, khách quan - Mặc định): Phân tích logic, đưa ra lời khuyên tài chính chuẩn mực, ngắn gọn và hữu ích.
  * `ROAST` (Cà khịa, thẳng thắn): Châm chọc hài hước, phê bình thẳng cánh khi tiêu tiền hoang phí để cảnh tỉnh thói quen tài chính.
* **Độ nhạy cảnh báo (`MascotSensitivity`)**:
  * `ALL`: Thông báo nhận xét và phản hồi ở mọi giao dịch chi tiêu/thu nhập.
  * `ANOMALIES_ONLY` (Mặc định): Chỉ bật cảnh báo khi phát hiện giao dịch bất thường (vượt ngân sách, chi tiêu đột biến > 200% trung bình).
  * `SILENT`: Không tự động cảnh báo, chỉ tương tác khi người dùng chủ động mở màn hình chat hoặc tap vào linh vật.
* **Cơ chế tích hợp LLM**: Giá trị `mascot_tone` và `mascot_sensitivity` được nạp trực tiếp vào System Prompt của `MascotsService` khi sinh lời khuyên tài chính qua AI.

### 3.2. Mô hình AI & Cơ chế BYOK (Bring Your Own Key)

Hệ thống cho phép người dùng tùy biến linh hoạt việc cấp quyền truy cập AI:

1. **Nhà cung cấp hỗ trợ (`AiProvider`)**:
   - `GEMINI`: Google Gemini AI (nhà cung cấp mặc định).
   - `OPENAI`: OpenAI (GPT-4o, GPT-4o-mini, v.v.).

2. **Cơ chế Fallback thông minh**:
   - Khi người dùng **tự nhập API Key** (`aiApiKey` khác rỗng): Mọi tác vụ AI của người dùng đó sẽ gọi bằng chính Key của họ và model họ đã chọn.
   - Khi người dùng **không tự cài đặt API Key** (`aiApiKey` là `null` hoặc chuỗi rỗng): Hệ thống tự động **fallback sang API Key mặc định của Finora** được cấu hình trong file môi trường `.env` (`GEMINI_API_KEY` hoặc `OPENAI_API_KEY`).
   - `SettingsService.getEffectiveAiConfig(userId)` là phương thức dùng chung giúp bất kỳ service nào gọi AI đều tự động nhận đúng Provider, Model và API Key hợp lệ mà không cần kiểm tra thủ công.

3. **Bảo mật API Key**:
   - Cột `ai_api_key` được thiết lập `select: false` trong TypeORM để chống rò rỉ dữ liệu qua các câu query thông thường.
   - Khi trả về client qua API, key sẽ **không bao giờ trả về nguyên vẹn**, mà chỉ trả về:
     - `hasCustomApiKey: boolean` (báo hiệu người dùng có đang dùng key riêng hay không).
     - `maskedApiKey`: Dạng che sao bảo mật (ví dụ: `AIzaSy...****XyZ`).

### 3.3. Bảo mật Khóa Ứng Dụng (App Lock & PIN)

Cung cấp lớp bảo vệ thứ 2 trên thiết bị để bảo vệ dữ liệu tài chính nhạy cảm:

1. **Thiết lập mã PIN (`POST /api/v1/settings/security/pin/setup`)**:
   - Chấp nhận mã số từ 4 đến 6 ký tự (`/^\d{4,6}$/`).
   - Mã hóa 1 chiều bằng thuật toán **bcrypt (salt rounds = 10)**.
   - Tự động bật `appLockEnabled = true` ngay sau khi thiết lập mã PIN thành công.
   - Từ chối nếu tài khoản đã có mã PIN (phải dùng API đổi mã PIN).

2. **Xác thực mã PIN (`POST /api/v1/settings/security/pin/verify`)**:
   - Sử dụng khi mở khóa ứng dụng hoặc truy cập khu vực nhạy cảm.
   - Đối chiếu hash bằng `bcrypt.compare`.
   - Trả về `{ success: true, verified: true }` nếu hợp lệ.

3. **Cơ chế Chống Tấn Công Brute-Force (Rate Limiting & Lockout)**:
   - **Tối đa 5 lần thử sai liên tiếp**.
   - Nếu nhập sai lần thứ 5, hệ thống lập tức **khóa tạm thời trong 5 phút (300 giây)**.
   - Trong thời gian khóa, mọi yêu cầu xác thực PIN đều bị từ chối với mã lỗi `HTTP 429 Too Many Requests` và thông báo thời gian còn lại cần chờ.
   - Khi nhập đúng, bộ đếm số lần thất bại sẽ được đặt lại về 0 ngay lập tức.
   - Hỗ trợ lưu trữ trạng thái phân tán trên **Redis** (`finora:pin-attempts:{userId}`), đồng thời có bộ đếm trong bộ nhớ RAM dự phòng (In-Memory fallback) khi Redis không khả dụng.

4. **Đổi mã PIN (`PUT /api/v1/settings/security/pin/change`)**:
   - Yêu cầu xác thực `oldPin` chính xác trước khi cho phép đổi.
   - Kiểm tra mã PIN mới không được trùng với mã PIN cũ (`SameNewPinException`).

5. **Tắt Khóa Ứng Dụng (`PUT /api/v1/settings/security/app-lock/disable`)**:
   - Để tắt `appLockEnabled`, người dùng bắt buộc phải gửi kèm mã PIN hiện tại để xác minh danh tính.

### 3.4. Tùy chọn Thông Báo & Cài Đặt Chung

* **Cài đặt chung (`PUT /api/v1/settings/general`)**:
  - Hỗ trợ cập nhật: `defaultCurrency`, `language` (`vi`, `en`), `theme` (`LIGHT`, `DARK`, `SYSTEM`), `defaultAmountHidden`, `defaultTransactionVisibility`.
* **Cài đặt thông báo (`PUT /api/v1/settings/notifications`)**:
  - Lưu trữ dưới dạng `jsonb` giúp frontend dễ dàng mở rộng danh sách các loại thông báo (thông báo ngân sách, biến động số dư, nhắc nhở định kỳ, tin nhắn bạn bè, nhắc nợ) mà không cần thay đổi schema database.

---

## 4. Danh Sách RESTful APIs

Tất cả các endpoint đều yêu cầu xác thực JWT (`Bearer Token`).

| Method | Endpoint | Mô tả | Request Body | Response chính |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/settings` | Lấy toàn bộ cài đặt hiện tại của người dùng | Không | `UserSettingsResponseDto` |
| **PUT** | `/api/v1/settings/general` | Cập nhật tùy chọn hiển thị, ngôn ngữ & theme | `UpdateGeneralSettingsDto` | `UserSettingsResponseDto` |
| **PUT** | `/api/v1/settings/mascot` | Cập nhật hiển thị, tone & độ nhạy Mascot | `UpdateMascotSettingsDto` | `UserSettingsResponseDto` |
| **PATCH** | `/api/v1/settings/ai` | Cập nhật AI Provider, Model và API Key riêng | `UpdateAiSettingsDto` | `UserSettingsResponseDto` |
| **DELETE** | `/api/v1/settings/ai/api-key` | Xóa API Key riêng, quay lại dùng key hệ thống | Không | `UserSettingsResponseDto` |
| **POST** | `/api/v1/settings/security/pin/setup` | Thiết lập mã PIN lần đầu & bật App Lock | `SetupPinDto` (`pin`) | `UserSettingsResponseDto` |
| **POST** | `/api/v1/settings/security/pin/verify`| Xác thực mã PIN (mở khóa app) | `VerifyPinDto` (`pin`) | `VerifyPinResponseDto` |
| **PUT** | `/api/v1/settings/security/pin/change`| Thay đổi mã PIN bảo mật | `ChangePinDto` (`oldPin`, `newPin`) | `UserSettingsResponseDto` |
| **PUT** | `/api/v1/settings/security/app-lock/disable` | Tắt App Lock (cần cung cấp PIN) | `DisableAppLockDto` (`pin`) | `UserSettingsResponseDto` |
| **PUT** | `/api/v1/settings/notifications` | Cập nhật cấu hình thông báo | `UpdateNotificationPreferencesDto` | `UserSettingsResponseDto` |

---

## 5. DTOs và Định dạng Dữ liệu

### Response DTO Chuẩn (`UserSettingsResponseDto`)

```json
{
  "defaultCurrency": "VND",
  "language": "vi",
  "theme": "SYSTEM",
  "appLockEnabled": true,
  "hasPin": true,
  "showMascot": true,
  "mascotTone": "ROAST",
  "mascotSensitivity": "ANOMALIES_ONLY",
  "currentMascotTierId": "a1b2c3d4-0000-0000-0000-000000000001",
  "aiProvider": "GEMINI",
  "aiModel": "gemini-1.5-flash",
  "hasCustomApiKey": true,
  "maskedApiKey": "AIzaSy...****1234",
  "defaultTransactionVisibility": "PRIVATE",
  "defaultAmountHidden": true,
  "notificationPreferences": {
    "budgetAlerts": true,
    "transactionReminders": true,
    "friendActivity": false
  }
}
```

> **Lưu ý bảo mật**: `pinHash` và `aiApiKey` được cấu hình `select: false` trong TypeORM và tuyệt đối **không** bao giờ được trả về client dạng raw. Client chỉ nhận các cờ `hasPin: boolean`, `hasCustomApiKey: boolean`, và `maskedApiKey: string` để hiển thị trên giao diện an toàn.

---

## 6. Kiến trúc Mã nguồn & Quy tắc Thiết kế

* **Repository Pattern**: Toàn bộ thao tác với CSDL đi qua `SettingsRepository`. Service không chứa raw SQL hoặc phụ thuộc trực tiếp vào query builder.
* **Mapper Separation**: `SettingsMapper` chuyển đổi `Setting` Entity thành `UserSettingsResponseDto`, đảm bảo chuẩn hóa dữ liệu đầu ra và bóc tách dữ liệu nhạy cảm.
* **Separation of Concerns**: Entity `Setting` được đặt đúng vị trí nghiệp vụ tại `src/modules/settings/entities/setting.entity.ts`.
* **Testing Coverage**: Đạt độ phủ kiểm thử 100% cho Controller & Service, tổng cộng 39/39 test suites trên toàn hệ thống backend đều vượt qua.
