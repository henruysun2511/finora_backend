// src/modules/ai-chat/services/transaction-draft.service.ts
import { Injectable } from '@nestjs/common';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { AI_CHAT_CONFIG } from '../constants';
import {
  CategoryLite,
  TransactionDraftInput,
  WalletAccountLite,
} from '../interfaces/ai-chat.types';
import { CategoryClassifierService } from './category-classifier.service';
import {
  EntityExtractorService,
  ExtractedTransaction,
} from './entity-extractor.service';
import { containsPhrase, normalizeForMatch } from '../utils/text.util';

export type DraftResult =
  | { ok: true; draft: TransactionDraftInput }
  | { ok: false; reason: 'no_amount' | 'amount_too_large' };

@Injectable()
export class TransactionDraftService {
  constructor(
    private readonly extractor: EntityExtractorService,
    private readonly categoryClassifier: CategoryClassifierService,
  ) {}

  /** Nhánh add_transaction: text -> regex trích số tiền/ngày -> phân loại danh mục -> bản nháp (chưa lưu). */
  async fromText(params: {
    text: string;
    source: string;
    accounts: WalletAccountLite[];
    categories: CategoryLite[];
    now?: Date;
  }): Promise<DraftResult> {
    const extracted = this.extractor.extractTransaction(
      params.text,
      params.now,
    );
    return this.build(extracted, params);
  }

  /** Nhánh hóa đơn: OCR text -> regex tổng tiền/tên cửa hàng -> phân loại danh mục. */
  async fromReceipt(params: {
    ocrText: string;
    source: string;
    accounts: WalletAccountLite[];
    categories: CategoryLite[];
    now?: Date;
  }): Promise<DraftResult> {
    const extracted = this.extractor.extractReceipt(params.ocrText, params.now);
    return this.build(extracted, {
      ...params,
      text: `${extracted.merchant ?? ''} ${params.ocrText.slice(0, 300)}`,
    });
  }

  private async build(
    extracted: ExtractedTransaction,
    p: {
      text: string;
      source: string;
      accounts: WalletAccountLite[];
      categories: CategoryLite[];
    },
  ): Promise<DraftResult> {
    if (extracted.amount === null || extracted.amount <= 0)
      return { ok: false, reason: 'no_amount' };
    if (extracted.amount > AI_CHAT_CONFIG.MAX_TRANSACTION_AMOUNT)
      return { ok: false, reason: 'amount_too_large' };

    const category = await this.categoryClassifier.resolve(
      p.text,
      extracted.name,
      extracted.type,
      p.categories,
    );
    const account = this.matchAccount(p.text, p.accounts);

    const name =
      extracted.name ||
      category.categoryName ||
      (extracted.type === TransactionType.INCOME
        ? 'Khoản thu mới'
        : 'Khoản chi mới');
    const missingFields: Array<'accountId' | 'categoryId'> = [];
    if (!account) missingFields.push('accountId');
    if (!category.categoryId) missingFields.push('categoryId');

    const warnings: string[] = [];
    if (extracted.candidateCount > 1)
      warnings.push(
        'Phát hiện nhiều số tiền trong câu, vui lòng kiểm tra lại số tiền.',
      );
    if (!p.accounts.length)
      warnings.push(
        'Ví chưa có tài khoản nào, hãy chọn hoặc tạo tài khoản trước khi lưu.',
      );
    if (!category.categoryId) {
      warnings.push(
        category.suggestedNewCategory
          ? `Chưa có danh mục phù hợp, gợi ý tạo danh mục mới: "${category.suggestedNewCategory}".`
          : 'Chưa xác định được danh mục, vui lòng chọn thủ công.',
      );
    }

    return {
      ok: true,
      draft: {
        type: extracted.type,
        amount: extracted.amount,
        name,
        date: extracted.date,
        note: null,
        accountId: account?.id ?? null,
        accountName: account?.name ?? null,
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryKey: category.categoryKey,
        categorySource: category.source,
        categoryConfidence: category.confidence,
        suggestedNewCategory: category.suggestedNewCategory,
        currency: account?.currency || 'VND',
        source: p.source,
        missingFields,
        warnings,
      },
    };
  }

  /** Ưu tiên tài khoản được nhắc tên; nếu không nhắc -> tài khoản đầu tiên của ví (nếu có). */
  matchAccount(
    text: string,
    accounts: WalletAccountLite[],
  ): WalletAccountLite | null {
    if (!accounts.length) return null;
    const norm = normalizeForMatch(text);
    const cashWords = ['tien mat', 'cash'];

    for (const a of accounts) {
      const an = normalizeForMatch(a.name);
      if (an && containsPhrase(norm, an)) return a;
    }
    for (const a of accounts) {
      const an = normalizeForMatch(a.name);
      if (
        cashWords.some((w) => containsPhrase(an, w)) &&
        cashWords.some((w) => containsPhrase(norm, w))
      )
        return a;
    }
    for (const a of accounts) {
      const tokens = normalizeForMatch(a.name)
        .split(' ')
        .filter((t) => t.length >= 5);
      if (tokens.some((t) => containsPhrase(norm, t))) return a;
    }
    return accounts[0];
  }
}
