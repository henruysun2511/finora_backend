// src/modules/ai-chat/services/chat-rate-limiter.service.ts
import { Injectable } from '@nestjs/common';
import { AI_CHAT_CONFIG } from '../constants';
import { AiChatRateLimitedException } from '../exceptions/ai-chat.exception';

/**
 * Giới hạn tần suất gửi tin theo user (cửa sổ trượt 60s). Lưu trong RAM của từng instance;
 * khi chạy nhiều instance nên thay bằng Redis/@nestjs/throttler.
 */
@Injectable()
export class ChatRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  assertAllowed(userId: string, now = Date.now()): void {
    const windowMs = 60_000;
    const limit = AI_CHAT_CONFIG.RATE_LIMIT_PER_MINUTE;
    const recent = (this.hits.get(userId) ?? []).filter(
      (t) => now - t < windowMs,
    );

    if (recent.length >= limit) {
      this.hits.set(userId, recent);
      throw new AiChatRateLimitedException(
        Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)),
      );
    }
    recent.push(now);
    this.hits.set(userId, recent);
    this.sweep(now, windowMs);
  }

  private sweep(now: number, windowMs: number): void {
    if (now - this.lastSweep < windowMs) return;
    this.lastSweep = now;
    for (const [uid, times] of this.hits) {
      if (!times.some((t) => now - t < windowMs)) this.hits.delete(uid);
    }
  }
}
