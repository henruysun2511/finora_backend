// src/modules/settings/exceptions/settings.exception.ts
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SETTINGS_ERROR_CODE } from '../settings.constant';

export class SettingsNotFoundException extends NotFoundException {
  constructor(userId?: string) {
    super({
      code: SETTINGS_ERROR_CODE.NOT_FOUND,
      message: userId
        ? `Không tìm thấy cài đặt người dùng cho ID: ${userId}`
        : 'Không tìm thấy cài đặt người dùng',
    });
  }
}

export class PinMismatchException extends BadRequestException {
  constructor() {
    super({
      code: SETTINGS_ERROR_CODE.PIN_MISMATCH,
      message: 'Mã PIN xác nhận không khớp với mã PIN đã nhập',
    });
  }
}

export class PinAlreadySetException extends BadRequestException {
  constructor() {
    super({
      code: SETTINGS_ERROR_CODE.PIN_ALREADY_SET,
      message: 'Mã PIN bảo mật đã được thiết lập trước đó. Vui lòng sử dụng tính năng Đổi mã PIN.',
    });
  }
}

export class PinNotSetException extends BadRequestException {
  constructor() {
    super({
      code: SETTINGS_ERROR_CODE.PIN_NOT_SET,
      message: 'Tài khoản chưa thiết lập mã PIN bảo mật. Vui lòng thiết lập mã PIN trước.',
    });
  }
}

export class InvalidPinException extends BadRequestException {
  constructor(remainingAttempts?: number) {
    super({
      code: SETTINGS_ERROR_CODE.INVALID_PIN,
      message:
        remainingAttempts !== undefined
          ? `Mã PIN không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi bị khóa tạm thời.`
          : 'Mã PIN không chính xác',
      remainingAttempts,
    });
  }
}

export class PinLockoutException extends ForbiddenException {
  constructor(minutesRemaining: number = 15) {
    super({
      code: SETTINGS_ERROR_CODE.PIN_LOCKED,
      message: `Bạn đã nhập sai mã PIN quá số lần cho phép. Tính năng mở khóa bị tạm khóa trong ${minutesRemaining} phút.`,
    });
  }
}

export class SameNewPinException extends BadRequestException {
  constructor() {
    super({
      code: SETTINGS_ERROR_CODE.SAME_NEW_PIN,
      message: 'Mã PIN mới không được trùng với mã PIN hiện tại',
    });
  }
}
