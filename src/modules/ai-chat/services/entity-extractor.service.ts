// src/modules/ai-chat/services/entity-extractor.service.ts
import { Injectable } from '@nestjs/common';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { AI_CHAT_CONFIG } from '../constants';
import { parseAmounts, parseBestAmount } from '../utils/amount.parser';
import {
  addDays,
  addMonthsClamped,
  isValidIsoDate,
  startOfMonth,
  TimeRange,
  todayVn,
} from '../utils/date.util';
import {
  capitalizeFirst,
  collapseSpaces,
  normalizeForMatch,
  removeRanges,
  stripDiacritics,
  truncate,
} from '../utils/text.util';

export interface ExtractedTransaction {
  amount: number | null;
  candidateCount: number;
  type: TransactionType;
  name: string;
  date: string;
  dateExplicit: boolean;
  merchant?: string | null;
}

const STRONG_INCOME =
  /\b(luong|thuong|bonus|thu nhap|hoan tien|cashback|duoc cho|duoc tang|doanh thu|tien lai|hoa hong|mung tuoi|li xi)\b/;
const WEAK_INCOME = /\b(nhan|thu|ban duoc|ban)\b/;
const EXPENSE_VERBS = /\b(mua|tra|chi|tieu|an|uong|dong|nap|mat|het|gui|dat)\b/;

const DATE_WORDS_RE = /\b(hom nay|hom qua|hom kia|hom bua|bua qua)\b/g;
const FILLER_RE = /\b(vua|moi|toi|minh|em|da|vua moi|nhe|nha|nhi|a|ha)\b/g;
const PAY_PHRASE_RE =
  /\b(tra|thanh toan|quet|dung|chuyen khoan|ck)\s+(bang|qua)\s+(the\s+|vi\s+|tai khoan\s+|tk\s+)?[a-z0-9]+(\s+[a-z0-9]+)?/g;

/** Trích xuất thực thể bằng regex/rule (số tiền, ngày, loại, tên giao dịch, khoảng thời gian truy vấn). */
@Injectable()
export class EntityExtractorService {
  extractTransaction(
    text: string,
    now: Date = new Date(),
  ): ExtractedTransaction {
    const original = (text ?? '').normalize('NFC');
    const stripped = stripDiacritics(original).toLowerCase();
    const best = parseBestAmount(original);

    const {
      date,
      explicit,
      ranges: dateRanges,
    } = this.extractDate(stripped, now);
    const type = this.detectType(stripped);

    // Tên = câu gốc bỏ số tiền, ngày, cụm "trả bằng ...", từ đệm
    const removal: Array<[number, number]> = [...best.spans, ...dateRanges];
    for (const re of [PAY_PHRASE_RE, DATE_WORDS_RE, FILLER_RE]) {
      for (const m of stripped.matchAll(re))
        removal.push([m.index!, m.index! + m[0].length]);
    }
    let name = collapseSpaces(removeRanges(original, removal)).replace(
      /^[\s,.\-:;]+|[\s,.\-:;]+$/g,
      '',
    );
    name = truncate(
      capitalizeFirst(name),
      AI_CHAT_CONFIG.MAX_TRANSACTION_NAME_LENGTH,
    );

    return {
      amount: best.amount,
      candidateCount: best.candidateCount,
      type,
      name,
      date,
      dateExplicit: explicit,
    };
  }

  /** Trích tổng tiền / tên cửa hàng / ngày từ văn bản OCR của hóa đơn. */
  extractReceipt(
    ocrText: string,
    now: Date = new Date(),
  ): ExtractedTransaction {
    const lines = (ocrText ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let amount: number | null = null;
    const totalLines = lines.filter((l) =>
      /\b(tong|thanh toan|thanh tien|total|amount due|grand total|phai tra)\b/.test(
        stripDiacritics(l).toLowerCase(),
      ),
    );
    for (const l of totalLines.reverse()) {
      const found = parseAmounts(l);
      if (found.length) {
        amount = Math.max(...found.map((f) => f.value));
        break;
      }
    }
    if (amount === null) {
      const all = lines.flatMap((l) => parseAmounts(l).map((f) => f.value));
      if (all.length) amount = Math.max(...all);
    }

    const merchantLine = lines.find((l) => {
      const n = normalizeForMatch(l);
      return (
        /[a-z]{3,}/.test(n) &&
        !/\b(hoa don|receipt|invoice|phieu|bill|dia chi|dt|tel|hotline|mst)\b/.test(
          n,
        )
      );
    });
    const merchant = merchantLine
      ? truncate(capitalizeFirst(collapseSpaces(merchantLine)), 80)
      : null;

    // Ngày dd/mm/yyyy trên hóa đơn
    let date = todayVn(now);
    let explicit = false;
    const m = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/.exec(ocrText ?? '');
    if (m) {
      const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (isValidIsoDate(iso) && iso <= todayVn(now)) {
        date = iso;
        explicit = true;
      }
    }

    return {
      amount,
      candidateCount: amount === null ? 0 : 1,
      type: TransactionType.EXPENSE,
      name: merchant ? `Hóa đơn ${merchant}` : 'Hóa đơn',
      date,
      dateExplicit: explicit,
      merchant,
    };
  }

  /** Khoảng thời gian người dùng hỏi; mặc định THIS_MONTH. */
  extractTimeRange(text: string): TimeRange {
    const n = normalizeForMatch(text);
    if (/\b(hom qua|bua qua)\b/.test(n)) return TimeRange.YESTERDAY;
    if (/\b(hom nay|ngay hom nay|bua nay)\b/.test(n)) return TimeRange.TODAY;
    if (/\btuan (truoc|roi|vua roi)\b/.test(n)) return TimeRange.LAST_WEEK;
    if (/\b(tuan nay|tuan qua)\b/.test(n)) return TimeRange.THIS_WEEK;
    if (/\bthang (truoc|roi|vua roi)\b/.test(n)) return TimeRange.LAST_MONTH;
    return TimeRange.THIS_MONTH;
  }

  // ── nội bộ ────────────────────────────────────────────────────────────────

  private detectType(strippedLower: string): TransactionType {
    if (STRONG_INCOME.test(strippedLower)) return TransactionType.INCOME;
    if (WEAK_INCOME.test(strippedLower) && !EXPENSE_VERBS.test(strippedLower))
      return TransactionType.INCOME;
    return TransactionType.EXPENSE;
  }

  private extractDate(
    stripped: string,
    now: Date,
  ): { date: string; explicit: boolean; ranges: Array<[number, number]> } {
    const today = todayVn(now);
    const ranges: Array<[number, number]> = [];
    const mark = (m: RegExpExecArray) =>
      ranges.push([m.index, m.index + m[0].length]);

    let m = /\bhom qua\b|\bbua qua\b/.exec(stripped);
    if (m) {
      mark(m);
      return { date: addDays(today, -1), explicit: true, ranges };
    }
    m = /\bhom kia\b|\bhom bua\b/.exec(stripped);
    if (m) {
      mark(m);
      return { date: addDays(today, -2), explicit: true, ranges };
    }

    // dd/mm/yyyy | dd/mm | dd-mm
    m = /\b(\d{1,2})\s?[/-]\s?(\d{1,2})(?:\s?[/-]\s?(\d{2,4}))?\b/.exec(
      stripped,
    );
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      let year = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      if (year < 100) year += 2000;
      let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (isValidIsoDate(iso)) {
        if (!m[3] && iso > today) iso = `${year - 1}-${iso.slice(5)}`; // chưa nói năm mà ở tương lai -> năm trước
        if (isValidIsoDate(iso) && iso <= today) {
          mark(m);
          return { date: iso, explicit: true, ranges };
        }
      }
    }

    // "ngày 15" (không nói tháng)
    m = /\bngay\s+(\d{1,2})\b(?!\s?[/-])/.exec(stripped);
    if (m) {
      const day = Number(m[1]);
      let candidate = `${startOfMonth(today).slice(0, 8)}${String(day).padStart(2, '0')}`;
      if (!isValidIsoDate(candidate)) candidate = '';
      if (candidate && candidate > today) {
        const prev =
          addMonthsClamped(startOfMonth(today), -1).slice(0, 8) +
          String(day).padStart(2, '0');
        candidate = isValidIsoDate(prev) ? prev : '';
      }
      if (candidate) {
        mark(m);
        return { date: candidate, explicit: true, ranges };
      }
    }

    m = /\bhom nay\b/.exec(stripped);
    if (m) mark(m);
    return { date: today, explicit: false, ranges };
  }
}
