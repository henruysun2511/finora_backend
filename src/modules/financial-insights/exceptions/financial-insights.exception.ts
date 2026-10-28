import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FINANCIAL_INSIGHTS_ERROR_CODE } from '../financial-insights.constant';

export class InsightWalletNotFoundException extends NotFoundException {
  constructor(walletId?: string) {
    super({
      code: FINANCIAL_INSIGHTS_ERROR_CODE.WALLET_NOT_FOUND,
      message: walletId
        ? `Không tìm thấy ví với mã "${walletId}" để phân tích chi tiêu`
        : 'Không tìm thấy ví cần phân tích chi tiêu',
    });
  }
}

export class InsightAccessDeniedException extends ForbiddenException {
  constructor(walletId?: string) {
    super({
      code: FINANCIAL_INSIGHTS_ERROR_CODE.ACCESS_DENIED,
      message: walletId
        ? `Bạn không có quyền xem thông tin chi tiêu của ví "${walletId}"`
        : 'Bạn không có quyền truy cập thông tin chi tiêu ví này',
    });
  }
}

export class InsightInvalidDateException extends BadRequestException {
  constructor(dateString?: string) {
    super({
      code: FINANCIAL_INSIGHTS_ERROR_CODE.INVALID_DATE,
      message: dateString
        ? `Ngày "${dateString}" không hợp lệ, vui lòng dùng định dạng YYYY-MM-DD`
        : 'Ngày phân tích chi tiêu không hợp lệ',
    });
  }
}
