import { AuditLogItemDto } from '../dto/response/audit-log-response.dto';

export class AuditExportUtil {
  private static escapeCsvField(value: any): string {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  static toCsv(items: AuditLogItemDto[]): string {
    const BOM = '\uFEFF'; // UTF-8 BOM để Excel hiển thị tiếng Việt không bị lỗi font

    const headers = [
      'Thời gian',
      'Người thực hiện',
      'Hành động',
      'Đối tượng',
      'Mã đối tượng',
      'Tóm tắt hoạt động',
      'Địa chỉ IP',
    ];

    const rows = items.map((item) => {
      const timeStr = item.createdAt
        ? new Date(item.createdAt).toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          })
        : '';

      return [
        this.escapeCsvField(timeStr),
        this.escapeCsvField(item.userName ?? 'Hệ thống'),
        this.escapeCsvField(item.action),
        this.escapeCsvField(item.entityType),
        this.escapeCsvField(item.entityId ?? ''),
        this.escapeCsvField(item.summary ?? ''),
        this.escapeCsvField(item.ipAddress ?? ''),
      ].join(',');
    });

    return (
      BOM + [headers.map(this.escapeCsvField).join(','), ...rows].join('\r\n')
    );
  }
}
