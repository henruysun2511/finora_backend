import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { WALLET_ERROR_CODE } from '../wallets.constant';

export class WalletNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: WALLET_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy ví với mã "${id}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class WalletAccessDeniedException extends AppError {
  constructor(walletId?: string) {
    super({
      code: WALLET_ERROR_CODE.ACCESS_DENIED,
      message: 'Bạn không có quyền thực hiện thao tác trên ví này',
      statusCode: HttpStatus.FORBIDDEN,
      details: walletId ? { walletId } : undefined,
    });
  }
}

export class WalletNameAlreadyExistsException extends AppError {
  constructor(name: string) {
    super({
      code: WALLET_ERROR_CODE.NAME_ALREADY_EXISTS,
      message: `Ví có tên "${name}" đã tồn tại trong danh sách ví của bạn`,
      statusCode: HttpStatus.CONFLICT,
      details: { name },
    });
  }
}

export class WalletMemberAlreadyExistsException extends AppError {
  constructor(userId: string) {
    super({
      code: WALLET_ERROR_CODE.MEMBER_ALREADY_EXISTS,
      message: 'Thành viên này đã tồn tại trong ví',
      statusCode: HttpStatus.CONFLICT,
      details: { userId },
    });
  }
}

export class WalletMemberNotFoundException extends AppError {
  constructor(memberId: string) {
    super({
      code: WALLET_ERROR_CODE.MEMBER_NOT_FOUND,
      message: `Không tìm thấy thành viên trong ví`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { memberId },
    });
  }
}

export class CannotRemoveOwnerException extends AppError {
  constructor() {
    super({
      code: WALLET_ERROR_CODE.CANNOT_REMOVE_OWNER,
      message: 'Không thể xóa chủ sở hữu khỏi ví',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
