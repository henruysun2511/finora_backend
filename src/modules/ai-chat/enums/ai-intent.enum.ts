// src/modules/ai-chat/enums/ai-intent.enum.ts

export enum AiIntent {
  ADD_TRANSACTION = 'add_transaction',
  QUERY_SPENDING = 'query_spending',
  CHITCHAT = 'chitchat',
  OUT_OF_SCOPE = 'out_of_scope',
  INTENT_UNCLEAR = 'intent_unclear',
}

/** Chuẩn hoá nhãn từ model/DB (kể cả nhãn con query_spending_summary, query_top_category...). */
export function normalizeIntentLabel(label: unknown): AiIntent | null {
  if (typeof label !== 'string') return null;
  const l = label.trim().toLowerCase();
  if (l.startsWith('query')) return AiIntent.QUERY_SPENDING;
  switch (l) {
    case 'add_transaction':
    case 'add':
      return AiIntent.ADD_TRANSACTION;
    case 'chitchat':
    case 'advice':
      return AiIntent.CHITCHAT;
    case 'out_of_scope':
    case 'oos':
      return AiIntent.OUT_OF_SCOPE;
    case 'intent_unclear':
    case 'unclear':
      return AiIntent.INTENT_UNCLEAR;
    default:
      return null;
  }
}
