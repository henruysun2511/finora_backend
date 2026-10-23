import { AuditLogDiffItemDto } from '../dto/response/audit-log-detail-response.dto';

export class AuditSummaryUtil {
  private static formatCurrency(amount: any): string {
    const num = Number(amount);
    if (isNaN(num)) return `${amount}`;
    return `${num.toLocaleString('vi-VN')}₫`;
  }

  static generateSummary(
    action: string,
    entityType: string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>,
  ): string {
    const upperAction = action?.toUpperCase();
    const upperEntity = entityType?.toUpperCase();

    // ── GIAO DỊCH (TRANSACTION) ───────────────────────────────────────────
    if (upperEntity === 'TRANSACTION') {
      if (upperAction === 'CREATE') {
        const amt = newValue?.amount
          ? ` với số tiền ${this.formatCurrency(newValue.amount)}`
          : '';
        return `Tạo mới giao dịch${amt}`;
      }
      if (upperAction === 'UPDATE') {
        if (
          oldValue?.amount !== undefined &&
          newValue?.amount !== undefined &&
          oldValue.amount !== newValue.amount
        ) {
          return `Đã cập nhật số tiền giao dịch từ ${this.formatCurrency(oldValue.amount)} thành ${this.formatCurrency(newValue.amount)}`;
        }
        if (
          oldValue?.note !== undefined &&
          newValue?.note !== undefined &&
          oldValue.note !== newValue.note
        ) {
          return `Đã cập nhật ghi chú giao dịch`;
        }
        return 'Đã cập nhật thông tin giao dịch';
      }
      if (upperAction === 'DELETE') {
        return 'Đã xóa giao dịch';
      }
    }

    // ── BẢO MẬT & TÀI KHOẢN (USER / AUTH) ─────────────────────────────────
    if (upperEntity === 'USER' || upperEntity === 'AUTH') {
      if (upperAction === 'LOGIN') return 'Đăng nhập vào hệ thống thành công';
      if (upperAction === 'LOGOUT') return 'Đăng xuất khỏi hệ thống';
      if (upperAction === 'PASSWORD_CHANGE') return 'Đã thay đổi mật khẩu tài khoản';
      if (upperAction === 'PROFILE_UPDATE') return 'Đã cập nhật thông tin hồ sơ cá nhân';
    }

    // ── TÀI KHOẢN TÀI CHÍNH (ACCOUNT) ────────────────────────────────────
    if (upperEntity === 'ACCOUNT') {
      const accName = newValue?.name ?? oldValue?.name ?? '';
      const namePart = accName ? ` "${accName}"` : '';
      if (upperAction === 'CREATE') return `Tạo mới tài khoản${namePart}`;
      if (upperAction === 'ADJUST_BALANCE') {
        return `Điều chỉnh số dư tài khoản${namePart}`;
      }
      if (upperAction === 'ARCHIVE') return `Lưu trữ tài khoản${namePart}`;
      if (upperAction === 'UNARCHIVE') return `Khôi phục tài khoản${namePart}`;
      if (upperAction === 'DELETE') return `Đã xóa tài khoản${namePart}`;
      if (upperAction === 'UPDATE') return `Cập nhật thông tin tài khoản${namePart}`;
    }

    // ── VÍ & THÀNH VIÊN VÍ (WALLET / WALLET_MEMBER) ───────────────────────
    if (upperEntity === 'WALLET' || upperEntity === 'WALLET_MEMBER') {
      if (upperAction === 'CREATE') return `Tạo mới ví tài chính`;
      if (upperAction === 'WALLET_UPDATE' || upperAction === 'UPDATE') {
        return `Cập nhật thông tin ví`;
      }
      if (upperAction === 'WALLET_DELETE' || upperAction === 'DELETE') {
        return `Đã xóa ví tài chính`;
      }
      if (upperAction === 'MEMBER_INVITE') return `Mời thành viên mới vào ví`;
      if (upperAction === 'MEMBER_ACCEPT') return `Chấp nhận lời mời tham gia ví`;
      if (upperAction === 'MEMBER_ROLE_CHANGE') return `Thay đổi vai trò thành viên ví`;
      if (upperAction === 'MEMBER_REMOVE') return `Xóa thành viên khỏi ví`;
    }

    // ── CHUYỂN TIỀN (TRANSFER) ────────────────────────────────────────────
    if (upperEntity === 'TRANSFER') {
      if (upperAction === 'CREATE') return `Tạo lệnh chuyển tiền`;
      if (upperAction === 'CANCEL') return `Hủy lệnh chuyển tiền`;
    }

    // ── VAY / NỢ (LOAN / LOAN_PAYMENT) ────────────────────────────────────
    if (upperEntity === 'LOAN' || upperEntity === 'LOAN_PAYMENT') {
      if (upperAction === 'CREATE') return `Tạo mới khoản vay/nợ`;
      if (upperAction === 'RECORD_PAYMENT') return `Ghi nhận thanh toán khoản nợ`;
      if (upperAction === 'UPDATE') return `Cập nhật thông tin khoản nợ`;
      if (upperAction === 'DELETE') return `Xóa khoản nợ`;
    }

    // ── NGÂN SÁCH (BUDGET) ────────────────────────────────────────────────
    if (upperEntity === 'BUDGET') {
      if (upperAction === 'CREATE') return `Tạo mới hạn mức ngân sách`;
      if (upperAction === 'UPDATE_LIMIT') return `Cập nhật hạn mức ngân sách`;
      if (upperAction === 'ROLLOVER_EXECUTE') return `Thực hiện kết chuyển ngân sách`;
      if (upperAction === 'DELETE') return `Xóa hạn mức ngân sách`;
    }

    // ── MẶC ĐỊNH ──────────────────────────────────────────────────────────
    if (upperAction === 'CREATE') return `Tạo mới đối tượng ${entityType}`;
    if (upperAction === 'UPDATE') return `Cập nhật đối tượng ${entityType}`;
    if (upperAction === 'DELETE') return `Xóa đối tượng ${entityType}`;

    return `${upperAction} ${upperEntity}`;
  }

  static calculateDiff(
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>,
  ): AuditLogDiffItemDto[] {
    const diff: AuditLogDiffItemDto[] = [];
    const oldObj = oldValue ?? {};
    const newObj = newValue ?? {};

    const allKeys = Array.from(
      new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
    );

    const ignoredFields = new Set([
      'id',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'password',
      'created_at',
      'updated_at',
      'deleted_at',
    ]);

    for (const key of allKeys) {
      if (ignoredFields.has(key)) continue;

      const fromVal = oldObj[key];
      const toVal = newObj[key];

      const fromStr = fromVal !== undefined ? JSON.stringify(fromVal) : undefined;
      const toStr = toVal !== undefined ? JSON.stringify(toVal) : undefined;

      if (fromStr !== toStr) {
        diff.push({
          field: key,
          from: fromVal !== undefined ? fromVal : null,
          to: toVal !== undefined ? toVal : null,
        });
      }
    }

    return diff;
  }
}
