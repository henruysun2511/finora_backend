// src/modules/ai-chat/services/speech-to-text.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { getAiModelConfig } from '../../../config/ai-model.config';
import { UploadedMedia } from '../interfaces/ai-chat.types';
import { AiSpeechRecognitionFailedException } from '../exceptions/ai-chat.exception';
import { ModelGatewayService } from './model-gateway.service';
import { collapseSpaces } from '../utils/text.util';

export interface SttResult {
  text: string;
  confidence: number | null;
}

/** PhoWhisper: audio -> text. Mọi thất bại đều trả 422 để client yêu cầu người dùng nhập tay. */
@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);

  constructor(private readonly gateway: ModelGatewayService) {}

  async transcribe(file: UploadedMedia): Promise<SttResult> {
    const cfg = getAiModelConfig();
    let raw: { text?: unknown; transcript?: unknown; confidence?: unknown };
    try {
      raw = await this.gateway.postFile(
        '/stt',
        file,
        { language: 'vi' },
        { timeoutMs: cfg.timeouts.sttMs, retries: 1 },
      );
    } catch (err) {
      this.logger.warn(`STT thất bại: ${(err as Error).message}`);
      throw new AiSpeechRecognitionFailedException(
        this.gateway.isConfigured()
          ? 'Dịch vụ nhận diện giọng nói đang bận. Vui lòng thử lại hoặc nhập tay.'
          : 'Chưa bật nhận diện giọng nói. Vui lòng nhập tay.',
      );
    }

    const text = collapseSpaces(String(raw?.text ?? raw?.transcript ?? ''));
    const confidence =
      typeof raw?.confidence === 'number' ? raw.confidence : null;

    if (!text)
      throw new AiSpeechRecognitionFailedException(
        'Không nghe rõ nội dung. Bạn nói lại hoặc nhập tay giúp mình nhé.',
      );
    if (confidence !== null && confidence < cfg.sttMinConfidence) {
      throw new AiSpeechRecognitionFailedException(
        'Âm thanh chưa đủ rõ để nhận diện chính xác. Bạn nói lại hoặc nhập tay nhé.',
      );
    }
    return { text, confidence };
  }
}
