import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';

export class RoleNotFoundException extends AppError {
  constructor(identifier: string) {
    super({
      code: 'ROLE_NOT_FOUND',
      message: `Không tìm thấy vai trò với thông tin: ${identifier}`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { identifier },
    });
  }
}

export class RoleCodeAlreadyExistsException extends AppError {
  constructor(code: string) {
    super({
      code: 'ROLE_CODE_ALREADY_EXISTS',
      message: `Mã vai trò '${code}' đã tồn tại trong hệ thống`,
      statusCode: HttpStatus.CONFLICT,
      details: { code },
    });
  }
}

export class PermissionNotFoundException extends AppError {
  constructor(identifier: string) {
    super({
      code: 'PERMISSION_NOT_FOUND',
      message: `Không tìm thấy quyền hạn với thông tin: ${identifier}`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { identifier },
    });
  }
}

export class PermissionCodeAlreadyExistsException extends AppError {
  constructor(code: string) {
    super({
      code: 'PERMISSION_CODE_ALREADY_EXISTS',
      message: `Mã quyền hạn '${code}' đã tồn tại trong hệ thống`,
      statusCode: HttpStatus.CONFLICT,
      details: { code },
    });
  }
}
