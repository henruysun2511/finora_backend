// src/modules/ai-chat/exceptions/ai-chat.exception.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AI_CHAT_ERROR_CODE } from '../constants';

export class AiChatWalletAccessDeniedException extends ForbiddenException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.WALLET_ACCESS_DENIED,
      message:
        'Bạn không có quyền truy cập hoặc thực hiện thao tác trên ví này',
    });
  }
}

export class PendingActionNotFoundException extends NotFoundException {
  constructor(actionId?: string) {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_NOT_FOUND,
      message: actionId
        ? `Không tìm thấy hành động chờ xác nhận với ID: ${actionId}`
        : 'Không tìm thấy hành động chờ xác nhận',
    });
  }
}

export class PendingActionExpiredException extends BadRequestException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_EXPIRED,
      message:
        'Hành động chờ đã quá thời hạn 15 phút và không thể xác nhận. Vui lòng tạo lại yêu cầu.',
    });
  }
}

export class PendingActionAlreadyProcessedException extends ConflictException {
  constructor(status: string) {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_ALREADY_PROCESSED,
      message: `Hành động này đã được xử lý trước đó với trạng thái: ${status}`,
    });
  }
}

export class PendingActionInvalidAccountException extends BadRequestException {
  constructor(
    message = 'Tài khoản thanh toán không hợp lệ hoặc không thuộc ví này',
  ) {
    super({ code: AI_CHAT_ERROR_CODE.PENDING_ACTION_INVALID_ACCOUNT, message });
  }
}

export class PendingActionInvalidCategoryException extends BadRequestException {
  constructor(
    message = 'Danh mục không hợp lệ hoặc không khớp loại giao dịch',
  ) {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_INVALID_CATEGORY,
      message,
    });
  }
}

export class AiChatInvalidAmountException extends BadRequestException {
  constructor(message = 'Số tiền giao dịch không hợp lệ') {
    super({ code: AI_CHAT_ERROR_CODE.INVALID_AMOUNT, message });
  }
}

export class AiChatInvalidDateException extends BadRequestException {
  constructor(message = 'Ngày giao dịch không hợp lệ hoặc nằm ở tương lai') {
    super({ code: AI_CHAT_ERROR_CODE.INVALID_DATE, message });
  }
}

export class AiChatInvalidNameException extends BadRequestException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.INVALID_NAME,
      message: 'Tên giao dịch không được để trống',
    });
  }
}

export class AiChatInvalidCursorException extends BadRequestException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.INVALID_CURSOR,
      message: 'beforeId không tồn tại trong lịch sử trò chuyện của ví này',
    });
  }
}

/** Giọng nói không nhận diện được -> 422, yêu cầu nhập tay (ai-flow.md). */
export class AiSpeechRecognitionFailedException extends UnprocessableEntityException {
  constructor(
    message = 'Không nhận diện được giọng nói. Vui lòng nói rõ hơn hoặc nhập tay.',
  ) {
    super({
      code: AI_CHAT_ERROR_CODE.STT_FAILED,
      message,
      requireManualInput: true,
    });
  }
}

/** Ảnh hóa đơn không đọc được -> 422, yêu cầu nhập tay. */
export class AiReceiptOcrFailedException extends UnprocessableEntityException {
  constructor(
    message = 'Không đọc được nội dung hóa đơn. Vui lòng chụp rõ hơn hoặc nhập tay.',
  ) {
    super({
      code: AI_CHAT_ERROR_CODE.OCR_FAILED,
      message,
      requireManualInput: true,
    });
  }
}

export class AiUnsupportedMediaException extends BadRequestException {
  constructor(message = 'Định dạng tệp không được hỗ trợ') {
    super({ code: AI_CHAT_ERROR_CODE.UNSUPPORTED_MEDIA, message });
  }
}

export class AiMediaRequiredException extends BadRequestException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.MEDIA_REQUIRED,
      message: 'Vui lòng đính kèm tệp âm thanh hoặc ảnh hóa đơn (field "file")',
    });
  }
}

export class AiChatRateLimitedException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        code: AI_CHAT_ERROR_CODE.RATE_LIMITED,
        message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít giây.',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class AiTransactionCreateFailedException extends InternalServerErrorException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.TRANSACTION_CREATE_FAILED,
      message:
        'Không thể lưu giao dịch lúc này. Hành động vẫn được giữ, vui lòng thử xác nhận lại.',
    });
  }
}
