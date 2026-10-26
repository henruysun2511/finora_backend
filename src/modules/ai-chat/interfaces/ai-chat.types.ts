// src/modules/ai-chat/interfaces/ai-chat.types.ts
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { MASCOT_CODES } from '../constants';

export type MascotCode = (typeof MASCOT_CODES)[number];

/** Dạng tối thiểu của tài khoản trong ví mà AI cần dùng. */
export interface WalletAccountLite {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

/** Dạng tối thiểu của danh mục mà AI cần dùng. */
export interface CategoryLite {
  id: string;
  name: string;
  type: TransactionType;
}

export interface UploadedMedia {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export type CategorySource = 'mention' | 'model' | 'rule' | 'none';

export interface CategoryResolution {
  categoryId: string | null;
  categoryName: string | null;
  categoryKey: string | null;
  confidence: number;
  source: CategorySource;
  /** Gợi ý tên danh mục MỚI khi hệ thống chưa có danh mục phù hợp (người dùng tự chọn/tạo). */
  suggestedNewCategory: string | null;
}

export interface TransactionDraftInput {
  type: TransactionType;
  amount: number;
  name: string;
  date: string; // YYYY-MM-DD (giờ VN)
  note: string | null;
  locationName?: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryKey: string | null;
  categorySource: CategorySource;
  categoryConfidence: number;
  suggestedNewCategory: string | null;
  currency: string;
  source: string;
  missingFields: Array<'accountId' | 'categoryId'>;
  warnings: string[];
}
