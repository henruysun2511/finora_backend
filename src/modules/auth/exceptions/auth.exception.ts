import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { AUTH_ERROR_CODE } from '../auth.constant';

export class InvalidCredentialsException extends AppError {
  constructor(message = 'Tên đăng nhập hoặc mật khẩu không chính xác') {
    super({
      code: AUTH_ERROR_CODE.INVALID_CREDENTIALS,
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class InvalidTokenException extends AppError {
  constructor(message = 'Token không hợp lệ hoặc đã bị thu hồi') {
    super({
      code: AUTH_ERROR_CODE.INVALID_TOKEN,
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class AccountInactiveException extends AppError {
  constructor() {
    super({
      code: AUTH_ERROR_CODE.ACCOUNT_INACTIVE,
      message: 'Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class OtpExpiredException extends AppError {
  constructor(
    message = 'Mã xác thực OTP đã hết hạn sau 30 giây. Vui lòng yêu cầu mã mới.',
  ) {
    super({
      code: AUTH_ERROR_CODE.OTP_EXPIRED,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidOtpException extends AppError {
  constructor(message = 'Mã xác thực OTP không chính xác') {
    super({
      code: AUTH_ERROR_CODE.INVALID_OTP,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TooManyOtpAttemptsException extends AppError {
  constructor(
    message = 'Bạn đã nhập sai mã OTP quá 3 lần. Vui lòng yêu cầu mã xác nhận mới.',
  ) {
    super({
      code: AUTH_ERROR_CODE.TOO_MANY_OTP_ATTEMPTS,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidResetTokenException extends AppError {
  constructor(
    message = 'Phiên xác thực đổi mật khẩu không hợp lệ hoặc đã hết hạn',
  ) {
    super({
      code: AUTH_ERROR_CODE.INVALID_RESET_TOKEN,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

