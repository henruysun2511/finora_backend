import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { MESSAGE_ERROR_CODE } from '../messages.constant';

export class MessageNotFoundException extends AppError {
  constructor() {
    super({
      code: MESSAGE_ERROR_CODE.NOT_FOUND,
      message: 'Không tìm thấy tin nhắn',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class CannotMessageNonFriendException extends AppError {
  constructor() {
    super({
      code: MESSAGE_ERROR_CODE.CANNOT_MESSAGE_NON_FRIEND,
      message: 'Bạn chỉ có thể gửi tin nhắn cho người đã kết bạn',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class MessageRecallTimeoutException extends AppError {
  constructor() {
    super({
      code: MESSAGE_ERROR_CODE.RECALL_TIMEOUT,
      message: 'Không thể thu hồi tin nhắn đã gửi quá 15 phút',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class UserBlockedException extends AppError {
  constructor() {
    super({
      code: MESSAGE_ERROR_CODE.USER_BLOCKED,
      message: 'Không thể gửi tin nhắn do quan hệ bị chặn',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
