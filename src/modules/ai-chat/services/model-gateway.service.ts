// src/modules/ai-chat/services/model-gateway.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { getAiModelConfig } from '../../../config/ai-model.config';

export type ModelErrorKind =
  | 'not_configured'
  | 'circuit_open'
  | 'timeout'
  | 'network'
  | 'http'
  | 'invalid_response';

export class ModelServiceError extends Error {
  constructor(
    public readonly kind: ModelErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ModelServiceError';
  }
}

interface RequestOptions {
  timeoutMs: number;
  retries?: number; // số lần thử lại SAU lần đầu (chỉ với lỗi tạm thời)
}

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

/**
 * Cổng gọi tới dịch vụ model tự train / Hugging Face (PhoBERT, BARTpho, PhoWhisper, VietOCR).
 * - Có timeout cho từng request, retry ngắn cho lỗi tạm thời.
 * - Circuit breaker: sau 5 lỗi liên tiếp thì tạm bỏ qua model 30s để mọi request rơi thẳng về fallback (không bị chậm).
 * - Mọi lỗi đều là ModelServiceError; nơi gọi chịu trách nhiệm fallback.
 */
@Injectable()
export class ModelGatewayService {
  private readonly logger = new Logger(ModelGatewayService.name);
  private consecutiveFailures = 0;
  private openUntil = 0;

  isConfigured(): boolean {
    return !!getAiModelConfig().baseUrl;
  }

  isAvailable(): boolean {
    return this.isConfigured() && Date.now() >= this.openUntil;
  }

  async postJson<T>(
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<T> {
    return this.execute<T>(
      path,
      () => ({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      options,
    );
  }

  async postFile<T>(
    path: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    fields: Record<string, string>,
    options: RequestOptions,
  ): Promise<T> {
    return this.execute<T>(
      path,
      () => {
        const form = new FormData();
        form.append(
          'file',
          new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
          file.originalname || 'upload',
        );
        for (const [k, v] of Object.entries(fields)) form.append(k, v);
        return { headers: {}, body: form };
      },
      options,
    );
  }

  /**
   * Gọi AI Service (Gemini) bóc tách thông tin giao dịch phức tạp (tên, số tiền chia, ngày, địa điểm, note).
   */
  async extractTransaction(
    text: string,
    today?: string,
  ): Promise<{
    name?: string;
    amount?: number;
    type?: string;
    date?: string;
    location?: string;
    note?: string;
  } | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.postJson<{
        name?: string;
        amount?: number;
        type?: string;
        date?: string;
        location?: string;
        note?: string;
      }>(
        '/extract-transaction',
        { text, today },
        { timeoutMs: 3500 },
      );
    } catch (err) {
      this.logger.warn(`Lỗi AI extract-transaction: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Gọi AI Service (Gemini) bóc tách cấu trúc hóa đơn từ văn bản OCR (tên quán, tổng tiền, thuế, tip, ngày, món ăn).
   */
  async extractReceipt(
    text: string,
    today?: string,
  ): Promise<{
    merchant_name?: string | null;
    merchant_address?: string | null;
    customer_name?: string | null;
    items?: Array<{
      name?: string | null;
      quantity?: number | null;
      unit_price?: number | null;
      total?: number | null;
    }> | null;
    subtotal?: number | null;
    tax?: number | null;
    tip?: number | null;
    total_amount?: number | null;
    currency?: string | null;
    date?: string | null;
  } | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.postJson(
        '/extract-receipt',
        { text, today },
        { timeoutMs: 12000 },
      );
    } catch (err) {
      this.logger.warn(`Lỗi AI extract-receipt: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Gọi AI Service (Gemini Function Calling) lập kế hoạch truy vấn tài chính thông minh:
   * Hiểu ngữ nghĩa tiếng Việt sâu sắc để chọn đúng 1 trong 10 hàm Canned Query + bóc tách tham số.
   */
  async planQuery(
    text: string,
    categories?: Array<{ id: string; name: string }>,
    today?: string,
  ): Promise<{
    function_name: string;
    time_range?: string;
    category_name?: string | null;
    limit?: number | null;
    direct_question?: string | null;
    confidence?: number;
  } | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.postJson<{
        function_name: string;
        time_range?: string;
        category_name?: string | null;
        limit?: number | null;
        direct_question?: string | null;
        confidence?: number;
      }>(
        '/plan-query',
        { text, categories, today },
        { timeoutMs: 4500 },
      );
    } catch (err) {
      this.logger.warn(`Lỗi AI plan-query: ${(err as Error).message}`);
      return null;
    }
  }

  private async execute<T>(
    path: string,
    build: () => { headers: Record<string, string>; body: BodyInit },
    options: RequestOptions,
  ): Promise<T> {
    const cfg = getAiModelConfig();
    if (!cfg.baseUrl)
      throw new ModelServiceError(
        'not_configured',
        'AI_MODEL_SERVICE_URL chưa được cấu hình',
      );
    if (Date.now() < this.openUntil)
      throw new ModelServiceError(
        'circuit_open',
        'Model service đang tạm ngắt (circuit open)',
      );

    const attempts = 1 + Math.max(0, options.retries ?? 0);
    let lastError: ModelServiceError | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        const result = await this.once<T>(
          cfg.baseUrl + path,
          cfg.apiKey,
          build(),
          options.timeoutMs,
        );
        this.consecutiveFailures = 0;
        return result;
      } catch (err) {
        lastError =
          err instanceof ModelServiceError
            ? err
            : new ModelServiceError(
                'network',
                String((err as Error)?.message ?? err),
              );
        // Lỗi 4xx / phản hồi sai định dạng: retry vô ích và không phải lỗi hạ tầng
        const transient =
          lastError.kind === 'timeout' ||
          lastError.kind === 'network' ||
          (lastError.kind === 'http' && (lastError.status ?? 500) >= 500);
        if (!transient) throw lastError;
        if (i < attempts - 1)
          await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }

    this.registerFailure(path, lastError!);
    throw lastError!;
  }

  private registerFailure(path: string, err: ModelServiceError): void {
    this.consecutiveFailures += 1;
    this.logger.warn(
      `Model service ${path} lỗi (${err.kind}${err.status ? ' ' + err.status : ''}): ${err.message}`,
    );
    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.openUntil = Date.now() + COOLDOWN_MS;
      this.consecutiveFailures = 0;
      this.logger.error(
        `Model service lỗi liên tiếp ${FAILURE_THRESHOLD} lần — tạm ngắt ${COOLDOWN_MS / 1000}s, dùng fallback.`,
      );
    }
  }

  private async once<T>(
    url: string,
    apiKey: string | null,
    req: { headers: Record<string, string>; body: BodyInit },
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { ...req.headers };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: req.body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ModelServiceError(
          'http',
          text.slice(0, 200) || res.statusText,
          res.status,
        );
      }
      try {
        return (await res.json()) as T;
      } catch {
        throw new ModelServiceError(
          'invalid_response',
          'Phản hồi không phải JSON hợp lệ',
        );
      }
    } catch (err) {
      if (err instanceof ModelServiceError) throw err;
      if ((err as Error)?.name === 'AbortError')
        throw new ModelServiceError('timeout', `Quá thời gian ${timeoutMs}ms`);
      throw new ModelServiceError(
        'network',
        String((err as Error)?.message ?? err),
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
