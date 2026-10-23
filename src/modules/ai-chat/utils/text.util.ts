// src/modules/ai-chat/utils/text.util.ts

/**
 * Bỏ dấu tiếng Việt nhưng GIỮ NGUYÊN độ dài chuỗi (mỗi ký tự dựng sẵn -> 1 ký tự gốc),
 * nên chỉ số vị trí (index) trên chuỗi đã bỏ dấu dùng được trực tiếp cho chuỗi gốc (NFC).
 */
export function stripDiacritics(input: string): string {
  const nfc = (input ?? '').normalize('NFC');
  let out = '';
  for (const ch of nfc) {
    if (ch === 'đ') out += 'd';
    else if (ch === 'Đ') out += 'D';
    else if (ch.length > 1 || ch.charCodeAt(0) < 128) out += ch;
    else out += ch.normalize('NFD')[0];
  }
  return out;
}

/** Chuẩn hoá để so khớp: bỏ dấu, lowercase, mọi ký tự không phải chữ/số -> khoảng trắng. */
export function normalizeForMatch(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Chuẩn hoá nhưng GIỮ dấu (dùng cho các từ khoá nhạy dấu như "trà" vs "trả"). */
export function normalizeKeepDiacritics(input: string): string {
  return (input ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Kiểm tra cụm từ xuất hiện như một cụm nguyên vẹn (ranh giới từ) trong chuỗi đã chuẩn hoá. */
export function containsPhrase(
  haystackNorm: string,
  phraseNorm: string,
): boolean {
  if (!phraseNorm) return false;
  return ` ${haystackNorm} `.includes(` ${phraseNorm} `);
}

export function collapseSpaces(input: string): string {
  return (input ?? '').replace(/\s+/g, ' ').trim();
}

export function capitalizeFirst(input: string): string {
  const s = (input ?? '').trim();
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('vi-VN') + s.slice(1);
}

/** Xoá các đoạn [start, end) khỏi chuỗi. */
export function removeRanges(
  input: string,
  ranges: Array<[number, number]>,
): string {
  if (!ranges.length) return input;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  let out = '';
  let cursor = 0;
  for (const [s, e] of sorted) {
    if (s > cursor) out += input.slice(cursor, s);
    cursor = Math.max(cursor, e);
  }
  return out + input.slice(cursor);
}

/** Thay các đoạn bằng khoảng trắng cùng độ dài (giữ nguyên index). */
export function blankRanges(
  input: string,
  ranges: Array<[number, number]>,
): string {
  const chars = input.split('');
  for (const [s, e] of ranges) {
    for (let i = s; i < e && i < chars.length; i++) chars[i] = ' ';
  }
  return chars.join('');
}

export function safeCurrency(code?: string | null): string {
  const c = (code || 'VND').toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : 'VND';
}

export function formatMoney(amount: number, currency?: string | null): string {
  const cur = safeCurrency(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: cur,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString('vi-VN')} ${cur}`;
  }
}

/** Thay {key} trong template bằng giá trị tương ứng; key thiếu -> chuỗi rỗng. */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return collapseSpaces(
    template.replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = vars[key];
      return v === undefined || v === null ? '' : String(v);
    }),
  );
}

export function pickRandom<T>(
  items: readonly T[],
  avoidIndex?: number,
): { value: T; index: number } {
  if (!items.length) throw new Error('pickRandom: danh sách rỗng');
  if (items.length === 1) return { value: items[0], index: 0 };
  let index = Math.floor(Math.random() * items.length);
  if (avoidIndex !== undefined && index === avoidIndex)
    index = (index + 1) % items.length;
  return { value: items[index], index };
}

export function truncate(input: string, max: number): string {
  const s = input ?? '';
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
}
