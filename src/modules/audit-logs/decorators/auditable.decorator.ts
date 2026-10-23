import { SetMetadata } from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogEntityType,
} from '../audit-logs.constant';

export const AUDITABLE_KEY = 'FINORA_AUDITABLE_KEY';

export interface AuditableOptions {
  /**
   * Loại hành động kiểm toán (CREATE, UPDATE, DELETE, LOGIN, LOGOUT,...)
   */
  action: AuditLogAction | string;

  /**
   * Phân hệ hoặc loại đối tượng (USER, AUTH, WALLET, TRANSACTION, ACCOUNT, LOAN,...)
   */
  entityType: AuditLogEntityType | string;

  /**
   * Tùy chọn định danh entityId:
   * - Tên trường trong req.params hoặc response (ví dụ: 'id', 'accountId', 'walletId')
   * - Hoặc hàm callback tùy biến: (req: any, res: any) => string | undefined
   * Mặc định: res?.data?.id || res?.id || req.params?.id || req.user?.id
   */
  entityId?: string | ((req: any, res: any) => string | undefined);

  /**
   * Tùy chọn định danh walletId (nếu hành động thuộc phạm vi ví):
   * - Tên trường hoặc hàm callback: (req: any, res: any) => string | undefined
   * Mặc định: req.params?.walletId || req.body?.walletId || res?.data?.walletId || res?.walletId
   */
  walletId?: string | ((req: any, res: any) => string | undefined);

  /**
   * Tùy chọn trích xuất dữ liệu trạng thái trước khi thay đổi (oldValue):
   * (req: any, res: any) => Record<string, any> | undefined
   */
  oldValue?: (req: any, res: any) => Record<string, any> | undefined;

  /**
   * Tùy chọn trích xuất dữ liệu trạng thái sau khi thay đổi (newValue):
   * (req: any, res: any) => Record<string, any> | undefined
   */
  newValue?: (req: any, res: any) => Record<string, any> | undefined;

  /**
   * Có tự động lưu req.body (đã loại bỏ thông tin nhạy cảm) làm newValue không.
   * Mặc định: true đối với POST / PATCH / PUT
   */
  includeBody?: boolean;
}

/**
 * Decorator đánh dấu endpoint controller cần được tự động ghi nhận nhật ký kiểm toán (Audit Log).
 * Hoạt động cùng AuditLogInterceptor mà không cần can thiệp vào tầng Service.
 *
 * @example
 * ```typescript
 * @Post()
 * @Auditable({
 *   action: AUDIT_LOG_ACTION.CREATE,
 *   entityType: AUDIT_LOG_ENTITY_TYPE.WALLET,
 * })
 * async createWallet(...) { ... }
 * ```
 */
export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDITABLE_KEY, options);
