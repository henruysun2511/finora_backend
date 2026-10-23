// src/modules/ai-chat/services/ocr.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { getAiModelConfig } from '../../../config/ai-model.config';
import { UploadedMedia } from '../interfaces/ai-chat.types';
import { AiReceiptOcrFailedException } from '../exceptions/ai-chat.exception';
import { ModelGatewayService } from './model-gateway.service';

export interface OcrResult {
  text: string;
  confidence: number | null;
}

/** VietOCR: ảnh hóa đơn -> text thô. Không đọc được -> 422, yêu cầu nhập tay. */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly gateway: ModelGatewayService) {}

  async extractText(file: UploadedMedia): Promise<OcrResult> {
    const cfg = getAiModelConfig();
    let raw: { text?: unknown; lines?: unknown; confidence?: unknown };
    try {
      raw = await this.gateway.postFile(
        '/ocr',
        file,
        { language: 'vi' },
        { timeoutMs: cfg.timeouts.ocrMs, retries: 1 },
      );
    } catch (err) {
      this.logger.warn(`OCR thất bại: ${(err as Error).message}`);
      throw new AiReceiptOcrFailedException(
        this.gateway.isConfigured()
          ? 'Dịch vụ đọc hóa đơn đang bận. Vui lòng thử lại hoặc nhập tay.'
          : 'Chưa bật đọc hóa đơn bằng ảnh. Vui lòng nhập tay.',
      );
    }

    let text = typeof raw?.text === 'string' ? raw.text : '';
    if (!text && Array.isArray(raw?.lines))
      text = (raw.lines as unknown[]).map(String).join('\n');
    text = text.trim();

    if (text.replace(/\s+/g, '').length < 5)
      throw new AiReceiptOcrFailedException();
    return {
      text,
      confidence: typeof raw?.confidence === 'number' ? raw.confidence : null,
    };
  }
}
