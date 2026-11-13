// src/modules/ai-chat/services/gemini.service.ts
import { Injectable, Logger } from '@nestjs/common';

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GenerateGeminiOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  history?: GeminiMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  /**
   * Gọi Google Gemini REST API để sinh văn bản / đàm thoại tài chính.
   */
  async generateText(options: GenerateGeminiOptions): Promise<string | null> {
    const {
      apiKey,
      model = 'gemini-1.5-flash',
      systemPrompt,
      userPrompt,
      history = [],
      temperature = 0.7,
      maxOutputTokens = 1024,
    } = options;

    if (!apiKey || apiKey.trim().length === 0) {
      this.logger.debug('Gemini API Key trống, bỏ qua generateText');
      return null;
    }

    const cleanModel = model.trim().replace(/^models\//, '');
    const endpoint = `${this.baseUrl}/models/${cleanModel}:generateContent?key=${apiKey.trim()}`;

    // Chuẩn bị contents theo chuẩn Gemini
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];

    // Lịch sử hội thoại nhiều lượt (nếu có)
    for (const msg of history) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Tin nhắn hiện tại của người dùng
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (systemPrompt && systemPrompt.trim().length > 0) {
      payload.system_instruction = {
        parts: [{ text: systemPrompt.trim() }],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.warn(
          `Gemini API HTTP ${response.status} (${response.statusText}): ${errorBody.slice(0, 300)}`,
        );
        return null;
      }

      const json = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidate = json.candidates?.[0];
      const partText = candidate?.content?.parts?.[0]?.text;

      if (partText && partText.trim().length > 0) {
        return partText.trim();
      }

      return null;
    } catch (err) {
      clearTimeout(timeout);
      this.logger.warn(`Lỗi khi gọi Gemini API: ${(err as Error)?.message}`);
      return null;
    }
  }
}

