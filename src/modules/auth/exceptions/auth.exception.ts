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
