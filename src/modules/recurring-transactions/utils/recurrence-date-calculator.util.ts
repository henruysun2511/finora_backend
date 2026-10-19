import { RecurrencePeriod } from '../enums/recurrence-period.enum';

export class RecurrenceDateCalculator {
  /**
   * Tính toán ngày thực thi tiếp theo dựa trên ngày hiện tại và tần suất lặp.
   * Xử lý chuẩn xác các trường hợp ngoại lệ ngày cuối tháng (End-of-Month).
   */
  static calculateNextRunDate(currentDate: Date, frequency: RecurrencePeriod): Date {
    const nextDate = new Date(currentDate);
    const originalDay = nextDate.getUTCDate();

    switch (frequency) {
      case RecurrencePeriod.DAILY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        break;

      case RecurrencePeriod.WEEKLY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        break;

      case RecurrencePeriod.BIWEEKLY:
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        break;

      case RecurrencePeriod.MONTHLY: {
        const targetMonth = nextDate.getUTCMonth() + 1;
        nextDate.setUTCMonth(targetMonth);
        
        // Kiểm tra xem có bị tràn ngày cuối tháng không (VD: 31/01 sang tháng 2)
        const currentDayInNewMonth = nextDate.getUTCDate();
        if (currentDayInNewMonth !== originalDay) {
          // Tràn tháng -> lùi về ngày cuối cùng của tháng mục tiêu
          nextDate.setUTCDate(0);
        }
        break;
      }

      case RecurrencePeriod.QUARTERLY: {
        const targetMonth = nextDate.getUTCMonth() + 3;
        nextDate.setUTCMonth(targetMonth);

        const currentDayInNewMonth = nextDate.getUTCDate();
        if (currentDayInNewMonth !== originalDay) {
          nextDate.setUTCDate(0);
        }
        break;
      }

      case RecurrencePeriod.YEARLY: {
        const targetYear = nextDate.getUTCFullYear() + 1;
        nextDate.setUTCFullYear(targetYear);

        const currentDayInNewMonth = nextDate.getUTCDate();
        if (currentDayInNewMonth !== originalDay) {
          nextDate.setUTCDate(0);
        }
        break;
      }

      default:
        throw new Error(`Unsupported recurrence period: ${frequency}`);
    }

    return nextDate;
  }
}