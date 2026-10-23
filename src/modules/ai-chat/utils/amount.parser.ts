// src/modules/ai-chat/utils/amount.parser.ts
import { blankRanges, stripDiacritics } from './text.util';

export interface ParsedAmount {
  value: number;
  start: number;
  end: number;
  raw: string;
  hasUnit: boolean;
}

const UNIT_MULT: Record<string, number> = {
  k: 1e3,
  nghin: 1e3,
  ngan: 1e3,
  tr: 1e6,
  trieu: 1e6,
  cu: 1e6,
  ty: 1e9,
  ti: 1e9,
  vnd: 1,
  dong: 1,
  d: 1,
};
const CURRENCY_UNITS = new Set(['vnd', 'dong', 'd']);

// Số (có thể có dấu phân cách) + đơn vị tuỳ chọn (k, nghìn, tr, triệu, củ, tỷ, đ...) + "rưỡi" hoặc số lẻ viết liền (1tr5)
const AMOUNT_RE =
  /(?<![a-z0-9])(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s?(trieu|nghin|ngan|vnd|dong|tr|cu|ty|ti|k|d)(?:\s?(ruoi)(?![a-z])|(\d{1,3})(?!\d)|(?=[^a-z0-9]|$)))?(?![a-z0-9])/g;

const NOISE_PATTERNS: RegExp[] = [
  /\b\d{1,2}\s?[/-]\s?\d{1,2}(?:\s?[/-]\s?\d{2,4})?\b/g, // ngày 15/10, 15-10-2026
  /\b\d{1,2}\s?(?:h|:|gio)\s?\d{0,2}\b/g, // 10h30, 10:30, 9 gio
  /\bnam\s+\d{4}\b/g, // năm 2026
  /\bngay\s+\d{1,2}\b/g, // ngày 15
  /\bthang\s+\d{1,2}\b/g, // tháng 10
  /\b0\d{9,10}\b/g, // số điện thoại
];

function toNumber(raw: string, hasUnit: boolean): number {
  const sepCount = (raw.match(/[.,]/g) || []).length;
  if (sepCount > 1) return Number(raw.replace(/[.,]/g, ''));
  if (!hasUnit && /^\d{1,3}[.,]\d{3}$/.test(raw))
    return Number(raw.replace(/[.,]/g, ''));
  return Number(raw.replace(',', '.'));
}

/** Tìm mọi số tiền hợp lệ trong câu (vị trí tính trên chuỗi NFC gốc). */
export function parseAmounts(text: string): ParsedAmount[] {
  const original = (text ?? '').normalize('NFC');
  let working = stripDiacritics(original).toLowerCase();

  // che các mẫu ngày/giờ/năm... để không nhầm thành số tiền
  const noise: Array<[number, number]> = [];
  for (const re of NOISE_PATTERNS) {
    for (const m of working.matchAll(re))
      noise.push([m.index!, m.index! + m[0].length]);
  }
  working = blankRanges(working, noise);

  const results: ParsedAmount[] = [];
  for (const m of working.matchAll(AMOUNT_RE)) {
    const rawNumber = m[1];
    const unit = m[2] || null;
    const half = m[3];
    const shorthand = m[4];
    const hasUnit = !!unit;
    const mult = unit ? UNIT_MULT[unit] : 1;

    // Đơn vị tiền tệ (đ, vnd, đồng) không nhân hệ số => "45.000đ" vẫn là 45000 (dấu chấm là phân cách nghìn)
    const multiplierUnit = hasUnit && mult > 1;
    let base = toNumber(rawNumber, multiplierUnit);
    if (!Number.isFinite(base)) continue;
    if (unit && shorthand)
      base += Number(shorthand) / Math.pow(10, shorthand.length);
    if (unit && half) base += 0.5;

    const value = Math.round(base * mult);
    const isCurrencyMarker = unit ? CURRENCY_UNITS.has(unit) : false;

    if (!hasUnit && value < 1000) continue; // số trơn nhỏ (2 cái bánh) không phải tiền
    if (isCurrencyMarker && value < 1) continue;
    if (value <= 0) continue;

    results.push({
      value,
      start: m.index!,
      end: m.index! + m[0].length,
      raw: original.slice(m.index!, m.index! + m[0].length),
      hasUnit,
    });
  }
  return results;
}

export interface BestAmount {
  amount: number | null;
  spans: Array<[number, number]>;
  candidateCount: number;
}

/** Chọn số tiền tốt nhất: ưu tiên số có đơn vị (50k, 1tr5), sau đó đến số trơn đầu tiên. */
export function parseBestAmount(text: string): BestAmount {
  const all = parseAmounts(text);
  if (!all.length) return { amount: null, spans: [], candidateCount: 0 };
  const withUnit = all.filter((a) => a.hasUnit);
  const chosen = (withUnit.length ? withUnit : all)[0];
  const distinct = new Set(all.map((a) => a.value));
  return {
    amount: chosen.value,
    spans: [[chosen.start, chosen.end]],
    candidateCount: distinct.size,
  };
}
