// src/modules/exchange-rates/exceptions/exchange-rate.exception.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { EXCHANGE_RATE_ERROR_CODE } from '../exchange-rates.constant';

export class UnsupportedCurrencyException extends AppError {
  constructor(currency: string) {
    super({
      code: EXCHANGE_RATE_ERROR_CODE.UNSUPPORTED_CURRENCY,
      message: `Loại tiền tệ "${currency}" không được hệ thống hỗ trợ`,
      statusCode: HttpStatus.BAD_REQUEST,
      details: { currency },
    });
  }
}

export class ExchangeRateFetchFailedException extends AppError {
  constructor(from: string, to: string, reason?: string) {
    super({
      code: EXCHANGE_RATE_ERROR_CODE.FETCH_FAILED,
      message: `Không thể lấy tỷ giá giữa "${from}" và "${to}" từ nhà cung cấp tỷ giá`,
      statusCode: HttpStatus.BAD_GATEWAY,
      details: { from, to, reason },
    });
  }
}
