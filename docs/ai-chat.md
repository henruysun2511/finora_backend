# Tài liệu Kỹ thuật Module AI Chatbot (`AiChatModule`)

## 1. Giới thiệu tổng quan
Module **AI Chatbot** của Finora đóng vai trò là trợ lý tài chính thông minh, tương tác với người dùng qua ngôn ngữ tự nhiên để:
1. **Ghi chép giao dịch nhanh (Human-in-the-Loop)**: Trích xuất loại chi tiêu, số tiền, danh mục, tài khoản từ tin nhắn chat, tạo `PendingAction` chờ người dùng xác nhận trước khi ghi sổ cái giao dịch thật.
2. **Truy vấn thống kê chi tiêu**: Lấy dữ liệu chi tiêu trong tháng, tổng hợp theo từng danh mục và trực quan hóa dưới dạng biểu đồ tròn (`CHART_PIE`).
3. **Tra cứu số dư ví**: Thống kê số dư hiện tại của tất cả tài khoản trong ví dưới dạng thẻ số liệu (`STAT_CARD`).
4. **Tương tác linh hoạt (Chitchat)**: Trò chuyện theo tính cách linh thú (Mascot) mà người dùng đang sở hữu (`Ruby`, `Ash`, `Sage`, `Nora`, `Bellingham`, `Penny`, `Jade`).
5. **Van an toàn (Safety Switch)**: Khi người dùng tắt linh thú (`show_mascot === false`), hệ thống tự động fallback về giọng điệu trung tính, lịch sự của Nora.

---

## 2. Kiến trúc & Luồng xử lý dữ liệu

```
[Người dùng gửi tin nhắn]
        │
        ▼
POST /api/v1/chat/messages
        │
        ├─ 1. Kiểm tra quyền truy cập ví (WalletsService.getWalletById)
        ├─ 2. Lưu tin nhắn người dùng vào DB (ChatMessage role = USER)
        ├─ 3. Lấy cấu hình LLM & Mascot (SettingsService & MascotsService)
        │      └─ Nếu show_mascot = false -> Buộc dùng tông Nora trung tính
        ├─ 4. Tải ngữ cảnh hội thoại (10 tin nhắn gần nhất)
        ├─ 5. Gọi LLM Service (Gemini / OpenAI REST API với Function Calling)
        │      └─ Timeout 8s -> Fallback về Mascot Template Pool nếu gặp sự cố
        │
        ▼
[Phân loại phản hồi từ LLM]
 ├── Tool "draft_transaction":
 │     ├─ Tạo bản ghi PendingAction (status = PENDING, TTL = 15 phút)
 │     ├─ Trả về ChatMessage với messageType = CONFIRMATION_PROMPT
 │     └─ Trả kèm previewPayload & pendingActionId để giao diện hiển thị nút Xác nhận/Sửa/Hủy
 │
 ├── Tool "execute_canned_query":
 │     ├─ AI chọn 1 hàm trong CannedQueryRegistry:
 │     │    • get_spending_summary -> TransactionsService.getDailyGrid -> CHART_PIE
 │     │    • get_wallet_balances -> AccountsService.listAccounts -> STAT_CARD
 │     │    • get_top_categories -> TransactionsService.getDailyGrid -> CHART_BAR
 │     └─ Nếu yêu cầu chức năng chưa hỗ trợ: Trả về thông báo từ chối thân thiện kèm danh sách hàm khả dụng
 │
 └── Tin nhắn văn bản thông thường (Chitchat / Out of scope):
       └─ Trả về ChatMessage với messageType = TEXT
```

---

## 3. Luồng Human-in-the-Loop (PendingAction)

Để đảm bảo an toàn tài chính tuyệt đối, AI **không bao giờ tự ý ghi sổ giao dịch** trực tiếp vào cơ sở dữ liệu nếu chưa có thao tác xác nhận từ người dùng.

```
AI gợi ý giao dịch ───> Tạo PendingAction (TTL 15m)
                             │
                             ├─ Người dùng bấm [HỦY] ───> status = REJECTED (kết thúc)
                             │
                             ├─ Hết hạn sau 15 phút ───> status = EXPIRED (Scheduler / Check)
                             │
                             └─ Người dùng bấm [XÁC NHẬN] (hoặc chỉnh sửa số tiền/danh mục)
                                     │
                                     ▼
                     POST /api/v1/chat/pending-actions/:id/execute
                                     │
                                     ├─ Validate quyền sở hữu & kiểm tra hạn 15m
                                     ├─ Gọi TransactionsService.createTransaction
                                     │    (source: CHAT_TEXT, type: EXPENSE/INCOME)
                                     └─ Cập nhật status = CONFIRMED, lưu transactionId
```

---

## 4. Danh sách API Endpoints

### 4.1. Gửi tin nhắn đến AI Chatbot
- **Method / Path**: `POST /api/v1/chat/messages`
- **Quyền**: Bearer Token (User đã đăng nhập)
- **Body**:
```json
{
  "walletId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "message": "Tôi vừa uống cà phê hết 35k tiền mặt"
}
```
- **Response** (201 Created):
```json
{
  "statusCode": 201,
  "message": "Thành công",
  "data": {
    "id": "e2a34567-89ab-cdef-0123-456789abcdef",
    "role": "ASSISTANT",
    "messageType": "CONFIRMATION_PROMPT",
    "textContent": "Tôi đã soạn sẵn phiếu chi tiêu Cà phê sáng 35,000 VND. Bạn xác nhận nhé?",
    "intent": "add_transaction",
    "mascot": "ruby",
    "payloadJson": {
      "pendingActionId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "toolName": "draft_transaction",
      "draft": {
        "type": "EXPENSE",
        "amount": 35000,
        "name": "Cà phê sáng",
        "categoryName": "Ăn uống",
        "accountName": "Tiền mặt"
      },
      "preview": {
        "title": "Xác nhận tạo giao dịch",
        "amountFormatted": "35.000 ₫",
        "type": "EXPENSE",
        "category": "Ăn uống",
        "account": "Tiền mặt",
        "expiresInMinutes": 15
      }
    },
    "createdAt": "2026-10-20T14:30:00.000Z"
  }
}
```

---

### 4.2. Thực thi hoặc Hủy bỏ Hành động chờ (`PendingAction`)
- **Method / Path**: `POST /api/v1/chat/pending-actions/:id/execute`
- **Quyền**: Bearer Token
- **Body xác nhận ngay**:
```json
{
  "action": "CONFIRM"
}
```
- **Body xác nhận kèm chỉnh sửa**:
```json
{
  "action": "CONFIRM",
  "editedData": {
    "amount": 40000,
    "name": "Cà phê sữa đá size L",
    "note": "Uống cùng đồng nghiệp"
  }
}
```
- **Body từ chối / hủy**:
```json
{
  "action": "REJECT"
}
```
- **Response** (200 OK):
```json
{
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "toolName": "draft_transaction",
    "status": "CONFIRMED",
    "transactionId": "f9a8b7c6-d5e4-3210-fedc-ba9876543210",
    "expiresAt": "2026-10-20T14:45:00.000Z",
    "createdAt": "2026-10-20T14:30:00.000Z"
  }
}
```

---

### 4.3. Lấy lịch sử hội thoại
- **Method / Path**: `GET /api/v1/chat/messages?walletId={walletId}&limit=20&beforeId={messageId}`
- **Response** (200 OK): Danh sách tin nhắn phân trang dạng cursor, sắp xếp theo thời gian mới nhất.

---

### 4.4. Xóa lịch sử trò chuyện trong ví
- **Method / Path**: `DELETE /api/v1/chat/messages?walletId={walletId}`
- **Response** (200 OK): Thông báo xóa sạch hội thoại trong ví của người dùng.

---

## 5. Dọn dẹp PendingAction hết hạn (`PendingActionsScheduler`)
- Cron job định kỳ **mỗi 5 phút**:
  ```ts
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPendingActions(): Promise<void>
  ```
- Tự động chuyển trạng thái từ `PENDING` sang `EXPIRED` đối với các bản ghi có `expiresAt < NOW()`.

---

## 6. Danh mục Mã lỗi (Error Codes)

| Mã lỗi | HTTP Status | Mô tả |
| :--- | :--- | :--- |
| `AI_PENDING_ACTION_NOT_FOUND` | 404 Not Found | Hành động chờ xác nhận không tồn tại hoặc không thuộc người dùng |
| `AI_PENDING_ACTION_EXPIRED` | 400 Bad Request | Hành động đã quá hạn 15 phút, cần gửi yêu cầu mới |
| `AI_PENDING_ACTION_ALREADY_PROCESSED` | 400 Bad Request | Hành động đã được xác nhận hoặc hủy bỏ trước đó |
| `AI_PENDING_ACTION_INVALID_ACCOUNT` | 400 Bad Request | Tài khoản thanh toán không tồn tại hoặc đã bị lưu trữ |
| `AI_PENDING_ACTION_INVALID_CATEGORY` | 400 Bad Request | Danh mục giao dịch không hợp lệ |
| `WALLET_ACCESS_DENIED` | 403 Forbidden | Người dùng không có quyền truy cập vào ví được chỉ định |

---

## 7. Kiểm thử (Unit Testing)
Module AI Chatbot sở hữu bộ kiểm thử đơn vị toàn diện tại thư mục `test/ai-chat/`:
- **`ai-chat.service.spec.ts`**:
  - Ghi nhận `add_transaction` sinh `PendingAction` và `CONFIRMATION_PROMPT`.
  - Van an toàn `show_mascot = false` ép buộc giọng điệu Nora trung tính.
  - Xử lý `query_spending` sinh dữ liệu `CHART_PIE` và cấu cấu chi tiêu.
  - Xử lý `query_wallet_balances` sinh `STAT_CARD`.
  - Xử lý `CONFIRM`, `REJECT`, xử lý ngoại lệ hết hạn hoặc đã xử lý.
- **`ai-chat.controller.spec.ts`**:
  - Kiểm thử đầy đủ 4 endpoints REST: Send message, Get history, Execute action, Clear history.

Chạy kiểm thử:
```bash
npm test -- test/ai-chat
```
Kết quả: **16/16 tests PASS**.
