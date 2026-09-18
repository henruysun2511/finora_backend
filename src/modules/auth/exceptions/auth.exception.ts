import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';

export class InvalidCredentialsException extends AppError {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      message: 'Email hoặc mật khẩu không chính xác',
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class InvalidTokenException extends AppError {
  constructor(message = 'Token không hợp lệ hoặc đã bị thu hồi') {
    super({
      code: 'INVALID_TOKEN',
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class AccountInactiveException extends AppError {
  constructor() {
    super({
      code: 'ACCOUNT_INACTIVE',
      message: 'Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
