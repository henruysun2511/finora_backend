# 🏛️ Kiến Trúc Hệ Thống & Luồng Dữ Liệu AI: FINORA_BE ⟷ AI_ANDROID

Tài liệu này mô tả chi tiết kiến trúc tích hợp, phân định trách nhiệm xử lý giữa **Backend (`finora_be`)** và **AI Microservice (`AI_ANDROID`)**, cùng sơ đồ luồng dữ liệu hoàn chỉnh cho 5 nhánh Intent và xử lý Đa phương tiện (Voice/OCR).

---

## 1. 📌 Bảng Phân Định Trách Nhiệm (Backend vs AI Service)

| Hạng mục công việc | Xử lý tại Backend (`finora_be` - NestJS) | Xử lý tại AI Service (`AI_ANDROID` - FastAPI) |
|---|---|---|
| **Xác thực & Bảo mật** | • Xác thực JWT, phân quyền truy cập ví, kiểm tra quyền sở hữu dữ liệu người dùng.<br>• Rate limiter chống spam request. | • Chỉ nhận request xử lý nội bộ từ Backend qua mạng private/localhost. |
| **Nhận diện Giọng nói (STT)** | • Kiểm tra định dạng audio (`.m4a`, `.mp3`) và dung lượng tệp ($\le 10$MB). | • Chạy mô hình **PhoWhisper / Gemini Audio** để chuyển âm thanh thành văn bản tiếng Việt. |
| **Đọc ảnh Hóa đơn (OCR)** | • Kiểm tra định dạng ảnh và dung lượng tệp ($\le 5$MB).<br>• Bóc tách số tiền tổng và ngày tháng từ text hóa đơn. | • Chạy mô hình **PaddleOCR / Gemini Vision** quét ảnh và trả về toàn bộ các dòng chữ. |
| **Phân loại Ý định (Intent)** | • Điều phối logic rẽ nhánh theo kết quả Intent.<br>• Có lớp Regex fallback nội bộ nếu AI Service bận. | • Chạy mô hình NLP phân loại chính xác vào **5 nhánh chuẩn** (`add_transaction`, `query_spending`, `chitchat`, `out_of_scope`, `intent_unclear`). |
| **Phân loại Danh mục (Category)**| • Gán ID danh mục trong database ví người dùng.<br>• Có từ điển mapping nội bộ dự phòng. | • Phân tích ngữ nghĩa món hàng/dịch vụ để gán vào danh mục phù hợp (*Ăn uống, Di chuyển, Mua sắm...*). |
| **Tính toán & Dữ liệu tài chính**| • **100% tính toán số dư, ngân sách, thống kê SQL trên PostgreSQL.**<br>• Tuyệt đối không để AI tự tính toán (tránh ảo giác sai số tiền). | • Không lưu database, không can thiệp số dư tiền thật. |
| **Sinh lời thoại Mascot (NLG)** | • Nạp ngữ cảnh tài chính của User (số dư, ngân sách tháng, linh thú theo tầng tài sản ròng). | • Đóng vai **7 Mascot chuẩn của Finora** (*Ash, Penny, Sage, Nora, Jade, Ruby, Bellingham*) tương ứng từng tầng Net Worth để sinh câu phản hồi tài chính chuẩn tính cách. |
| **Lưu trữ & Phê duyệt (HITL)** | • Quản lý vòng đời **PendingAction** (chờ người dùng xác nhận trước khi lưu sổ cái).<br>• Lưu lịch sử chat vào bảng `chat_messages`. | • Không trạng thái (Stateless). |

---

## 2. 🏗️ Sơ Đồ Kiến Trúc Tổng Thể (System Architecture)

```mermaid
flowchart TB
    subgraph ClientLayer ["📱 TẦNG CLIENT (Mobile App)"]
        MobileApp["Finora Mobile App (Flutter)"]
    end

    subgraph BackendLayer ["🏢 TẦNG BACKEND (finora_be - NestJS)"]
        ChatController["AiChatController\n(/api/v1/chat/messages)"]
        ChatService["AiChatService\n(Điều phối luồng nghiệp vụ)"]
        Gateway["ModelGatewayService\n(Circuit Breaker & HTTP Client)"]
        DB[(PostgreSQL\nVí, Giao dịch, Chat, PendingAction)]
        LocalEngine["Local Rule Engine\n(Bóc tách số tiền, Regex fallback)"]
    end

    subgraph AIServiceLayer ["🧠 TẦNG AI MICROSERVICE (AI_ANDROID - FastAPI)"]
        GatewayRouter["Model Gateway Router\n(Port 8000)"]
        
        subgraph AIModules ["Các Module AI Xử Lý"]
            STTMod["STT Service\n(PhoWhisper / Gemini Audio)"]
            OCRMod["OCR Service\n(PaddleOCR / Gemini Vision)"]
            NLPMod["NLP Service\n(Rule Engine + PhoBERT + Gemini)"]
            PersonaMod["Persona Service\n(Template Slot-filling + Gemini)"]
        end
    end

    %% Tương tác luồng chính
    MobileApp -->|"1. Gửi tin nhắn / File ghi âm / Ảnh hóa đơn"| ChatController
    ChatController --> ChatService
    ChatService <-->|"Lưu / Đọc số dư, lịch sử chat"| DB
    ChatService -->|"Dự phòng khi AI ngắt kết nối"| LocalEngine

    ChatService -->|"2. Ủy thác tác vụ AI giác quan"| Gateway
    Gateway -->|"3. Gọi REST API (HTTP)"| GatewayRouter

    GatewayRouter -->|"/stt"| STTMod
    GatewayRouter -->|"/ocr"| OCRMod
    GatewayRouter -->|"/intent & /category"| NLPMod
    GatewayRouter -->|"/generate"| PersonaMod

    %% Trả kết quả ngược lại
    AIModules -->|"4. JSON kết quả AI"| GatewayRouter
    GatewayRouter --> Gateway
    Gateway --> ChatService
    ChatService -->|"5. Tin nhắn + Thẻ xác nhận giao dịch"| MobileApp
```

---

## 3. 🔄 Sơ Đồ Chi Tiết 5 Nhánh Intent

Khi người dùng gửi câu văn bản hoặc sau khi dịch giọng nói thành văn bản, Backend sẽ gửi câu sang AI Service qua `POST /intent`. Luồng xử lý rẽ nhánh như sau:

```mermaid
flowchart TD
    UserText["Câu văn bản của Người dùng\n(Ví dụ: 'Ăn bát phở 45k')"]
    
    subgraph AIStep ["Xử lý tại AI_ANDROID (/intent)"]
        Classifier{"Phân loại Intent\n(NLP Service)"}
    end

    UserText --> Classifier

    %% 5 Nhánh
    Classifier -->|"1. add_transaction"| Branch1["Nhánh 1: SINH GIAO DỊCH\n(Chi tiêu / Thu nhập / Chuyển khoản)"]
    Classifier -->|"2. query_spending"| Branch2["Nhánh 2: TRUY VẤN CHI TIÊU\n(Xem báo cáo, hỏi số dư, thống kê)"]
    Classifier -->|"3. chitchat"| Branch3["Nhánh 3: TÁN GẪU / LỜI KHUYÊN\n(Chào hỏi, cảm ơn, hỏi mẹo tiết kiệm)"]
    Classifier -->|"4. out_of_scope"| Branch4["Nhánh 4: NGOÀI PHẠM VI\n(Thời tiết, code, crypto, bóng đá...)"]
    Classifier -->|"5. intent_unclear"| Branch5["Nhánh 5: KHÔNG RÕ Ý ĐỊNH\n(Câu quá ngắn, ký tự '???', mơ hồ)"]

    %% Backend xử lý cho từng nhánh
    subgraph BEStep ["Xử lý tại finora_be"]
        %% Branch 1
        Branch1 --> BE_B1_1["1. Gọi AI /category để lấy danh mục"]
        BE_B1_1 --> BE_B1_2["2. Tự bóc tách số tiền & ngày tháng"]
        BE_B1_2 --> BE_B1_3["3. Tạo PendingAction trong PostgreSQL"]
        BE_B1_3 --> BE_B1_4["4. Gọi AI /generate sinh lời thoại Mascot"]
        BE_B1_4 --> Out1["📱 Trả về Mobile: Lời thoại + Thẻ [Xác nhận lưu]"]

        %% Branch 2
        Branch2 --> BE_B2_1["1. Backend chạy SQL thật trên PostgreSQL"]
        BE_B2_1 --> BE_B2_2["2. Tổng hợp số liệu chính xác 100%"]
        BE_B2_2 --> BE_B2_3["3. Gọi AI /generate đưa số liệu vào lời thoại"]
        BE_B2_3 --> Out2["📱 Trả về Mobile: Lời thoại + Thẻ Biểu đồ/Số dư"]

        %% Branch 3
        Branch3 --> BE_B3_1["1. Xác định ngữ cảnh (chào hỏi hay xin mẹo)"]
        BE_B3_1 --> BE_B3_2["2. Gọi AI /generate sinh lời thoại theo Mascot"]
        BE_B3_2 --> Out3["📱 Trả về Mobile: Lời thoại trò chuyện của Mascot"]

        %% Branch 4
        Branch4 --> BE_B4_1["1. Gọi AI /generate sinh câu từ chối khéo léo"]
        BE_B4_1 --> Out4["📱 Trả về Mobile: 'Em chỉ là trợ lý tài chính thôi nha!'"]

        %% Branch 5
        Branch5 --> BE_B5_1["1. Tạo câu hỏi làm rõ kèm 3 nút gợi ý hành động"]
        BE_B5_1 --> Out5["📱 Trả về Mobile: 'Gợi ý: [Ghi chép] [Báo cáo] [Mẹo]'"]
    end
```

---

## 4. 🎙️🖼️ Sơ Đồ Xử Lý Đa Phương Tiện (Voice STT & Receipt OCR)

Khi người dùng gửi file ghi âm hoặc ảnh chụp hóa đơn lên `POST /api/v1/chat/messages/media`:

```mermaid
sequenceDiagram
    autonumber
    actor User as 📱 Mobile App
    participant BE as 🏢 finora_be (NestJS)
    participant AI as 🧠 AI_ANDROID (FastAPI)
    participant DB as 🗄️ PostgreSQL

    alt Người dùng gửi File Ghi Âm Giọng Nói (.m4a / .mp3)
        User->>BE: POST /api/v1/chat/messages/media (audio file)
        BE->>AI: POST /stt (Gửi file âm thanh)
        Note over AI: PhoWhisper / Gemini Audio dịch giọng nói
        AI-->>BE: {"text": "ăn bát phở bò 45k", "confidence": 0.95}
        Note over BE: Chuyển đoạn text vào pipeline xử lý văn bản thông thường (như Kịch bản Intent ở trên)
    else Người dùng gửi Ảnh Hóa Đơn (.jpg / .png)
        User->>BE: POST /api/v1/chat/messages/media (image file)
        BE->>AI: POST /ocr (Gửi file ảnh)
        Note over AI: PaddleOCR / Gemini Vision quét ảnh
        AI-->>BE: {"text": "PHỞ THÌN... Bát tái 45.000đ... Tổng: 45.000", "lines": [...]}
        Note over BE: Bộ Regex của Backend bóc tách: Tổng tiền = 45.000đ, Tên quán = Phở Thìn
        BE->>AI: POST /category {"text": "Phở Thìn Bát tái"}
        AI-->>BE: {"category": "Ăn uống", "confidence": 0.95}
        BE->>DB: Tạo PendingAction (Hóa đơn quét nháp)
        BE->>AI: POST /generate (Sinh lời thoại Mascot chúc ngon miệng)
        AI-->>BE: {"text": "Mẹ thấy hóa đơn ăn phở 45k nhé, nhớ giữ gìn sức khỏe!"}
        BE-->>User: Trả về: Lời thoại Mascot + Thẻ hóa đơn chờ xác nhận
    end
```

---

## 5. 🔌 Chi Tiết Hợp Đồng Giao Tiếp API (API Contracts)

Cả hai hệ thống giao tiếp qua giao thức REST HTTP (chuẩn JSON và multipart/form-data) trên cổng `http://localhost:8000`:

### 1. `POST /ocr`
* **Input (multipart/form-data):** `file: UploadFile` (ảnh hóa đơn).
* **Output (JSON):**
  ```json
  {
    "text": "Nội dung đầy đủ đọc từ hóa đơn...",
    "lines": ["Dòng 1", "Dòng 2", "Dòng 3"],
    "confidence": 0.95,
    "engine": "paddleocr"
  }
  ```

### 2. `POST /stt`
* **Input (multipart/form-data):** `file: UploadFile` (âm thanh giọng nói).
* **Output (JSON):**
  ```json
  {
    "text": "nội dung người dùng vừa nói",
    "transcript": "nội dung người dùng vừa nói",
    "confidence": 0.92
  }
  ```

### 3. `POST /intent`
* **Input (JSON):**
  ```json
  { "text": "ăn bát phở bò 45k" }
  ```
* **Output (JSON):**
  ```json
  {
    "intent": "add_transaction",
    "confidence": 0.95
  }
  ```
  *(Các giá trị intent: `add_transaction`, `query_spending`, `chitchat`, `out_of_scope`, `intent_unclear`)*

### 4. `POST /category`
* **Input (JSON):**
  ```json
  { "text": "ăn bát phở bò 45k" }
  ```
* **Output (JSON):**
  ```json
  {
    "category": "Ăn uống",
    "confidence": 0.95
  }
  ```

### 5. `POST /generate`
* **Input (JSON):**
  ```json
  {
    "persona": "strict_mom",
    "balance": 50000,
    "budget": 5000000,
    "amount": 45000,
    "category": "Ăn uống"
  }
  ```
* **Output (JSON):**
  ```json
  {
    "text": "Mẹ nhìn cái số dư mà xót hết cả ruột! Bớt trà sữa với mua sắm linh tinh lại ngay cho mẹ!",
    "message": "Mẹ nhìn cái số dư mà xót hết cả ruột! Bớt trà sữa với mua sắm linh tinh lại ngay cho mẹ!"
  }
  ```

---

## 6. 🛡️ Cơ Chế An Toàn (Fault Tolerance & Circuit Breaker)

Nhằm đảm bảo ứng dụng không bao giờ bị gián đoạn:
1. **Circuit Breaker tại Backend:**
   * Nếu `AI_ANDROID` gặp sự cố hoặc timeout quá 5 lần liên tiếp, Backend sẽ kích hoạt Circuit Breaker, tạm ngưng gọi sang AI Service trong 30 giây để tránh làm nghẽn luồng xử lý của người dùng.
2. **Local Fallback Engine:**
   * Trong lúc AI Service tạm dừng, Backend tự động kích hoạt **bộ Regex Engine nội bộ** ([entity-extractor.service.ts](file:///f:/Project/FINORA/finora_be/src/modules/ai-chat/services/entity-extractor.service.ts)) để tự bóc tách số tiền, gán danh mục cơ bản và trả về template mặc định.
   * Người dùng trên điện thoại vẫn có thể ghi chép chi tiêu bình thường mà không hề nhận thấy lỗi máy chủ.
