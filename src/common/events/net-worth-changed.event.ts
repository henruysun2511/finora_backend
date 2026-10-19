// src/common/events/net-worth-changed.event.ts

export const EVENT_NET_WORTH_CHANGED = 'net_worth.changed';

/**
 * Sự kiện phát sinh khi tài sản ròng của người dùng bị biến động:
 * - Tạo / sửa / xóa giao dịch thu chi (Transactions)
 * - Điều chỉnh số dư tài khoản trực tiếp (Account Balance Adjustments)
 * - Tạo tài khoản mới có số dư ban đầu
 * - Vay nợ / Trả nợ (Loans / Debts)
 * - Chuyển khoản (Transfers)
 */
export class NetWorthChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly source?: string,
  ) {}
}
