// src/modules/ai-chat/services/mascot-context.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MascotsService } from '../../mascots/mascots.service';
import { SettingsService } from '../../settings/settings.service';
import { AI_CHAT_CONFIG, MASCOT_CODES } from '../constants';
import { MascotCode } from '../interfaces/ai-chat.types';

/**
 * Xác định mascot hiện tại của user (quyết định giọng điệu + lời khuyên).
 * Van an toàn `show_mascot = false` -> dùng tông Nora trung tính, áp dụng NHẤT QUÁN cho mọi nhánh.
 * Mọi lỗi tra cứu đều rơi về Nora (không làm hỏng cuộc hội thoại).
 */
@Injectable()
export class MascotContextService {
  private readonly logger = new Logger(MascotContextService.name);

  constructor(
    private readonly mascotsService: MascotsService,
    private readonly settingsService: SettingsService,
  ) {}

  async resolve(userId: string): Promise<MascotCode> {
    const fallback = AI_CHAT_CONFIG.DEFAULT_MASCOT_CODE as MascotCode;
    try {
      const settings = await this.settingsService.getSettings(userId);
      if (settings && settings.showMascot === false) return fallback;
    } catch (err) {
      this.logger.warn(
        `Không đọc được USER_SETTINGS (${(err as Error).message}), dùng Nora.`,
      );
      return fallback;
    }

    try {
      const data = await this.mascotsService.getCurrentUserMascot(userId);
      const code = String(data?.mascot?.tierName ?? '')
        .trim()
        .toLowerCase();
      return (MASCOT_CODES as readonly string[]).includes(code)
        ? (code as MascotCode)
        : fallback;
    } catch (err) {
      this.logger.warn(
        `Không xác định được mascot hiện tại (${(err as Error).message}), dùng Nora.`,
      );
      return fallback;
    }
  }
}
