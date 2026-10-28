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
import { ModelGatewayService } from './model-gateway.service';
import { containsPhrase, normalizeForMatch } from '../utils/text.util';

export type DraftResult =
  | { ok: true; draft: TransactionDraftInput }
  | { ok: false; reason: 'no_amount' | 'amount_too_large' };

@Injectable()
export class TransactionDraftService {
  constructor(
    private readonly extractor: EntityExtractorService,
    private readonly categoryClassifier: CategoryClassifierService,
    private readonly gateway: ModelGatewayService,
  ) {}

  /** Nhánh add_transaction: Ưu tiên AI Service (Gemini) bóc tách thông minh, câu siêu ngắn chạy Fast-Path (Regex). */
  async fromText(params: {
    text: string;
    source: string;
    accounts: WalletAccountLite[];
    categories: CategoryLite[];
    now?: Date;
  }): Promise<DraftResult> {
    const rawText = (params.text || '').trim();
    const words = rawText.split(/\s+/).filter(Boolean);
    const nowDate = params.now ?? new Date();

    // Fast-path: Với câu cực ngắn (<= 3 từ) khớp mẫu đơn giản (vd: "ăn sáng 50k", "xăng 100k")
    // thì dùng Regex tức thì để siêu nhanh (0.1ms)
    const isVerySimple =
      words.length <= 3 &&
      !rawText.includes('chia') &&
      !rawText.includes('mỗi') &&
      !rawText.includes('hết') &&
      !rawText.includes('ở') &&
      !rawText.includes('tại');

    if (!isVerySimple && this.gateway.isAvailable()) {
      try {
        const todayStr = nowDate.toISOString().slice(0, 10);
        const aiExtracted = await this.gateway.extractTransaction(
          rawText,
          todayStr,
        );
        if (
          aiExtracted &&
          aiExtracted.name &&
          typeof aiExtracted.amount === 'number' &&
          aiExtracted.amount > 0
        ) {
          const extracted: ExtractedTransaction = {
            amount: aiExtracted.amount,
            candidateCount: 1,
            type:
              aiExtracted.type === 'INCOME'
                ? TransactionType.INCOME
                : TransactionType.EXPENSE,
            name: aiExtracted.name,
            date: aiExtracted.date || todayStr,
            dateExplicit: Boolean(aiExtracted.date),
            merchant: aiExtracted.location,
            locationName: aiExtracted.location,
            note: aiExtracted.note,
          };
          return this.build(extracted, params);
        }
      } catch (err) {
        // Fallback to regex below
      }
    }

    const extracted = this.extractor.extractTransaction(
      params.text,
      params.now,
    );
    return this.build(extracted, params);
  }

  /** Nhánh hóa đơn: Ưu tiên AI Service (Gemini) bóc tách có cấu trúc, fallback sang Regex nội bộ. */
  async fromReceipt(params: {
    ocrText: string;
    source: string;
    accounts: WalletAccountLite[];
    categories: CategoryLite[];
    now?: Date;
  }): Promise<DraftResult> {
    const rawOcr = (params.ocrText || '').trim();
    const nowDate = params.now ?? new Date();
    const todayStr = nowDate.toISOString().slice(0, 10);

    if (this.gateway.isAvailable() && rawOcr.length > 5) {
      try {
        const aiReceipt = await this.gateway.extractReceipt(rawOcr, todayStr);
        if (
          aiReceipt &&
          typeof aiReceipt.total_amount === 'number' &&
          aiReceipt.total_amount > 0
        ) {
          const merchant = aiReceipt.merchant_name?.trim() || null;
          const itemsList = Array.isArray(aiReceipt.items) ? aiReceipt.items : [];
          const itemsSummary = itemsList.length
            ? itemsList
                .filter((it) => it && it.name)
                .map((it) => `${it.name}${it.quantity ? ` x${it.quantity}` : ''}`)
                .join(', ')
            : null;

          const extracted: ExtractedTransaction = {
            amount: aiReceipt.total_amount,
            candidateCount: 1,
            type: TransactionType.EXPENSE,
            name: merchant ? `Hóa đơn ${merchant}` : 'Hóa đơn',
            date: aiReceipt.date || todayStr,
            dateExplicit: Boolean(aiReceipt.date),
            merchant,
            locationName: merchant || aiReceipt.merchant_address || null,
            note: itemsSummary ? `Chi tiết: ${itemsSummary}` : null,
          };

          return this.build(
            extracted,
            {
              ...params,
              text: `${merchant ?? ''} ${itemsSummary ?? ''} ${rawOcr.slice(0, 300)}`,
            },
            {
              merchantName: merchant,
              taxAmount: typeof aiReceipt.tax === 'number' ? aiReceipt.tax : null,
              tipAmount: typeof aiReceipt.tip === 'number' ? aiReceipt.tip : null,
              ocrRawData: aiReceipt,
            },
          );
        }
      } catch (err) {
        // Fallback to regex below
      }
    }

    const extracted = this.extractor.extractReceipt(params.ocrText, params.now);
    return this.build(
      extracted,
      {
        ...params,
        text: `${extracted.merchant ?? ''} ${params.ocrText.slice(0, 300)}`,
      },
      {
        merchantName: extracted.merchant ?? null,
        ocrRawData: { text: params.ocrText },
      },
    );
  }

  private async build(
    extracted: ExtractedTransaction,
    p: {
      text: string;
      source: string;
      accounts: WalletAccountLite[];
      categories: CategoryLite[];
    },
    extraFields?: Partial<TransactionDraftInput>,
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
        note: extracted.note ?? null,
        locationName: extracted.locationName ?? extracted.merchant ?? null,
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
        ...extraFields,
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
