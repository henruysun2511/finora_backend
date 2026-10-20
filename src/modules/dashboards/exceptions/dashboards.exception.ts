import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { DASHBOARD_ERROR_CODE } from '../dashboards.constant';

export class DashboardWalletAccessDeniedException extends AppError {
  constructor(walletId: string) {
    super({
      code: DASHBOARD_ERROR_CODE.WALLET_ACCESS_DENIED,
      message: `Bạn không có quyền truy cập dữ liệu dashboard của ví "${walletId}"`,
      statusCode: HttpStatus.FORBIDDEN,
      details: { walletId },
    });
  }
}