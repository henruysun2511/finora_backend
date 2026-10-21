// src/modules/ai-chat/exceptions/ai-chat.exception.ts
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AI_CHAT_ERROR_CODE } from '../ai-chat.constant';

export class AiChatWalletAccessDeniedException extends ForbiddenException {
  constructor() {
    super({
      code: AI_CHAT_ERROR_CODE.WALLET_ACCESS_DENIED,
      message: 'Bạn không có quyền truy cập hoặc thực hiện thao tác trên ví này',
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
      message: 'Hành động chờ đã quá thời hạn 15 phút và không thể xác nhận. Vui lòng tạo lại yêu cầu.',
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
  constructor(message = 'Tài khoản thanh toán không hợp lệ hoặc không thuộc ví này') {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_INVALID_ACCOUNT,
      message,
    });
  }
}

export class PendingActionInvalidCategoryException extends BadRequestException {
  constructor(message = 'Danh mục chi tiêu không hợp lệ') {
    super({
      code: AI_CHAT_ERROR_CODE.PENDING_ACTION_INVALID_CATEGORY,
      message,
    });
  }
}
