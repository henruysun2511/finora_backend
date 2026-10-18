// src/modules/accounts/exceptions/account.exception.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { ACCOUNT_ERROR_CODE } from '../accounts.constant';

export class AccountNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: ACCOUNT_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy tài khoản với mã "${id}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class AccountWalletNotFoundException extends AppError {
  constructor(walletId: string) {
    super({
      code: ACCOUNT_ERROR_CODE.WALLET_NOT_FOUND,
      message: `Không tìm thấy ví với mã "${walletId}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { walletId },
    });
  }
}

export class AccountAccessDeniedException extends AppError {
  constructor(walletId: string) {
    super({
      code: ACCOUNT_ERROR_CODE.ACCESS_DENIED,
      message: 'Bạn không có quyền thực hiện thao tác này trên ví',
      statusCode: HttpStatus.FORBIDDEN,
      details: { walletId },
    });
  }
}

export class AccountNameAlreadyExistsException extends AppError {
  constructor(name: string) {
    super({
      code: ACCOUNT_ERROR_CODE.NAME_ALREADY_EXISTS,
      message: `Tên tài khoản "${name}" đã tồn tại trong ví này`,
      statusCode: HttpStatus.CONFLICT,
      details: { name },
    });
  }
}

export class AccountArchivedException extends AppError {
  constructor(id: string) {
    super({
      code: ACCOUNT_ERROR_CODE.ARCHIVED,
      message: 'Tài khoản đã được lưu trữ, vui lòng bỏ lưu trữ trước khi thực hiện thao tác này',
      statusCode: HttpStatus.CONFLICT,
      details: { id },
    });
  }
}

export class AccountHasTransactionsException extends AppError {
  constructor(id: string) {
    super({
      code: ACCOUNT_ERROR_CODE.HAS_TRANSACTIONS,
      message:
        'Tài khoản đã phát sinh giao dịch nên không thể xóa. Hãy sử dụng chức năng lưu trữ tài khoản',
      statusCode: HttpStatus.CONFLICT,
      details: { id },
    });
  }
}

export class AccountCurrencyChangeNotAllowedException extends AppError {
  constructor(id: string) {
    super({
      code: ACCOUNT_ERROR_CODE.CURRENCY_CHANGE_NOT_ALLOWED,
      message: 'Không thể đổi loại tiền tệ khi tài khoản đã có số dư hoặc lịch sử giao dịch',
      statusCode: HttpStatus.CONFLICT,
      details: { id },
    });
  }
}

export class AccountCurrencyMismatchWalletException extends AppError {
  constructor(accountCurrency: string, walletCurrency: string) {
    super({
      code: ACCOUNT_ERROR_CODE.CURRENCY_MISMATCH_WALLET,
      message: `Tiền tệ của tài khoản (${accountCurrency}) phải trùng khớp với tiền tệ của ví (${walletCurrency}). Mỗi ví chỉ được chứa các tài khoản cùng loại tiền tệ`,
      statusCode: HttpStatus.BAD_REQUEST,
      details: { accountCurrency, walletCurrency },
    });
  }
}

export class AccountInsufficientBalanceException extends AppError {
  constructor(balance: number, amount: number) {
    super({
      code: ACCOUNT_ERROR_CODE.INSUFFICIENT_BALANCE,
      message: 'Điều chỉnh giảm vượt quá số dư hiện tại của tài khoản',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details: { balance, amount },
    });
  }
}

export class IdempotencyKeyRequiredException extends AppError {
  constructor() {
    super({
      code: ACCOUNT_ERROR_CODE.IDEMPOTENCY_KEY_REQUIRED,
      message: 'Thiếu header Idempotency-Key',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AccountSameSourceAndDestinationException extends AppError {
  constructor(accountId: string) {
    super({
      code: ACCOUNT_ERROR_CODE.SAME_SOURCE_DESTINATION,
      message: 'Tài khoản nguồn và tài khoản đích không được trùng nhau',
      statusCode: HttpStatus.BAD_REQUEST,
      details: { accountId },
    });
  }
}

