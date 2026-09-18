import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';

export class UserNotFoundException extends AppError {
  constructor(identifier: string) {
    super({
      code: 'USER_NOT_FOUND',
      message: `Không tìm thấy người dùng với thông tin: ${identifier}`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { identifier },
    });
  }
}

export class EmailAlreadyExistsException extends AppError {
  constructor(email: string) {
    super({
      code: 'EMAIL_ALREADY_EXISTS',
      message: `Email '${email}' đã tồn tại trên hệ thống`,
      statusCode: HttpStatus.CONFLICT,
      details: { email },
    });
  }
}
