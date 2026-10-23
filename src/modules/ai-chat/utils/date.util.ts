// src/modules/ai-chat/utils/date.util.ts
// Toàn bộ logic ngày của AI chat tính theo múi giờ Việt Nam (UTC+7), KHÔNG dùng UTC.

export const VN_TZ = 'Asia/Ho_Chi_Minh';
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export enum TimeRange {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
}

export interface ResolvedRange {
  range: TimeRange;
  from: string; // YYYY-MM-DD (bao gồm)
  to: string; // YYYY-MM-DD (bao gồm)
  label: string; // "hôm nay", "tháng này"...
  previous: { from: string; to: string; label: string };
}

export function toVnIsoDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function todayVn(now: Date = new Date()): string {
  return toVnIsoDate(now);
}

export function isValidIsoDate(iso: string): boolean {
  const m = ISO_RE.exec(iso ?? '');
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

function parts(iso: string): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Ngày ISO không hợp lệ: ${iso}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function fromUtc(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parts(iso);
  return fromUtc(new Date(Date.UTC(y, m - 1, d + days)));
}

export function addMonthsClamped(iso: string, months: number): string {
  const { y, m, d } = parts(iso);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUtc(target);
}

export function startOfWeekMonday(iso: string): string {
  const { y, m, d } = parts(iso);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = CN
  const diff = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -diff);
}

export function startOfMonth(iso: string): string {
  const { y, m } = parts(iso);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function endOfMonth(iso: string): string {
  const { y, m } = parts(iso);
  return fromUtc(new Date(Date.UTC(y, m, 0)));
}

/** Danh sách (year, month) mà khoảng [from, to] đi qua. */
export function monthsBetween(
  from: string,
  to: string,
): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  let cursor = startOfMonth(from);
  const last = startOfMonth(to);
  let guard = 0;
  while (cursor <= last && guard++ < 36) {
    const p = parts(cursor);
    out.push({ year: p.y, month: p.m });
    cursor = addMonthsClamped(cursor, 1);
  }
  return out;
}

export function resolveRange(
  range: TimeRange,
  now: Date = new Date(),
): ResolvedRange {
  const today = todayVn(now);
  switch (range) {
    case TimeRange.TODAY:
      return {
        range,
        from: today,
        to: today,
        label: 'hôm nay',
        previous: {
          from: addDays(today, -1),
          to: addDays(today, -1),
          label: 'hôm qua',
        },
      };
    case TimeRange.YESTERDAY: {
      const y = addDays(today, -1);
      return {
        range,
        from: y,
        to: y,
        label: 'hôm qua',
        previous: {
          from: addDays(y, -1),
          to: addDays(y, -1),
          label: 'hôm kia',
        },
      };
    }
    case TimeRange.THIS_WEEK: {
      const from = startOfWeekMonday(today);
      return {
        range,
        from,
        to: today,
        label: 'tuần này',
        previous: {
          from: addDays(from, -7),
          to: addDays(from, -1),
          label: 'tuần trước',
        },
      };
    }
    case TimeRange.LAST_WEEK: {
      const thisMon = startOfWeekMonday(today);
      const from = addDays(thisMon, -7);
      return {
        range,
        from,
        to: addDays(thisMon, -1),
        label: 'tuần trước',
        previous: {
          from: addDays(from, -7),
          to: addDays(from, -1),
          label: 'tuần trước nữa',
        },
      };
    }
    case TimeRange.LAST_MONTH: {
      const lastMonthDay = addMonthsClamped(startOfMonth(today), -1);
      const prevPrev = addMonthsClamped(lastMonthDay, -1);
      return {
        range,
        from: startOfMonth(lastMonthDay),
        to: endOfMonth(lastMonthDay),
        label: 'tháng trước',
        previous: {
          from: startOfMonth(prevPrev),
          to: endOfMonth(prevPrev),
          label: 'tháng trước nữa',
        },
      };
    }
    case TimeRange.THIS_MONTH:
    default: {
      const from = startOfMonth(today);
      const prevMonth = addMonthsClamped(from, -1);
      return {
        range: TimeRange.THIS_MONTH,
        from,
        to: today,
        label: 'tháng này',
        previous: {
          from: startOfMonth(prevMonth),
          to: endOfMonth(prevMonth),
          label: 'tháng trước',
        },
      };
    }
  }
}

/** Chuyển Date/ISO-string bất kỳ -> YYYY-MM-DD (giờ VN). Không hợp lệ -> null. */
export function normalizeAnyDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : toVnIsoDate(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (ISO_RE.test(trimmed)) return isValidIsoDate(trimmed) ? trimmed : null;
    const dt = new Date(trimmed);
    return Number.isNaN(dt.getTime()) ? null : toVnIsoDate(dt);
  }
  return null;
}

/** ISO date -> Date để lưu giao dịch: hôm nay dùng thời điểm hiện tại, ngày khác dùng 12:00 giờ VN. */
export function isoToTransactionDate(
  iso: string,
  now: Date = new Date(),
): Date {
  if (iso === todayVn(now)) return now;
  return new Date(`${iso}T12:00:00+07:00`);
}
