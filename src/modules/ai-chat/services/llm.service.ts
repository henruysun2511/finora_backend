// src/modules/ai-chat/services/llm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '../../settings/enums/ai-provider.enum';
import { AiIntent } from '../enums/ai-intent.enum';
import { MASCOT_TEMPLATE_POOL, AI_CHAT_CONFIG } from '../ai-chat.constant';

export interface LlmToolCall {
  name:
    | 'draft_transaction'
    | 'execute_canned_query'
    | 'query_spending_summary'
    | 'query_wallet_balances';
  args: Record<string, any>;
}

export interface LlmExecutionResult {
  text: string;
  toolCall?: LlmToolCall | null;
  intent?: AiIntent;
  usedFallback?: boolean;
}

export interface LlmChatContextMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  // Định nghĩa Schema công cụ (Function Calling)
  private readonly toolDeclarations = [
    {
      name: 'draft_transaction',
      description:
        'Được gọi khi người dùng muốn ghi chép/thêm một khoản chi tiêu hoặc thu nhập (ví dụ: "vừa ăn phở 45k", "tiêu 100k mua sách", "vừa nhận lương 15tr").',
      parameters: {
        type: 'OBJECT',
        properties: {
          type: {
            type: 'STRING',
            enum: ['EXPENSE', 'INCOME'],
            description: 'Loại giao dịch: EXPENSE (Chi tiêu) hoặc INCOME (Thu nhập)',
          },
          amount: {
            type: 'NUMBER',
            description: 'Số tiền giao dịch bằng số nguyên/thực (ví dụ: 45000, 15000000)',
          },
          name: {
            type: 'STRING',
            description: 'Tên hoặc lý do giao dịch ngắn gọn (ví dụ: "Ăn phở", "Mua sách", "Tiền lương")',
          },
          categoryName: {
            type: 'STRING',
            description: 'Tên danh mục chi tiêu/thu nhập phù hợp (ví dụ: "Ăn uống", "Đi lại", "Mua sắm", "Lương")',
          },
          accountName: {
            type: 'STRING',
            description: 'Tên tài khoản hoặc phương thức thanh toán nếu có nhắc tới (ví dụ: "Tiền mặt", "Momo", "Vietcombank")',
          },
          date: {
            type: 'STRING',
            description: 'Ngày giao dịch dạng YYYY-MM-DD (nếu user nói ngày cụ thể hoặc "hôm qua", "hôm nay")',
          },
          note: {
            type: 'STRING',
            description: 'Ghi chú thêm nếu có',
          },
        },
        required: ['type', 'amount', 'name'],
      },
    },
    {
      name: 'execute_canned_query',
      description:
        'Được gọi khi người dùng muốn tra cứu, thống kê số liệu tài chính trong ví (chi tiêu, số dư, top danh mục). Bạn chỉ được chọn đúng 1 tên hàm có trong danh mục hàm hệ thống hỗ trợ.',
      parameters: {
        type: 'OBJECT',
        properties: {
          functionName: {
            type: 'STRING',
            enum: ['get_spending_summary', 'get_wallet_balances', 'get_top_categories'],
            description:
              'Tên hàm truy vấn cần thực thi: "get_spending_summary" (tổng quan chi tiêu, cơ cấu danh mục), "get_wallet_balances" (số dư các tài khoản), hoặc "get_top_categories" (top danh mục chi nhiều nhất).',
          },
          parameters: {
            type: 'OBJECT',
            description: 'Các tham số tương ứng cho hàm truy vấn',
            properties: {
              timeRange: {
                type: 'STRING',
                enum: ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH'],
                description: 'Khoảng thời gian thống kê',
              },
              categoryName: {
                type: 'STRING',
                description: 'Tên danh mục cần lọc nếu có',
              },
              limit: {
                type: 'NUMBER',
                description: 'Số lượng mục cần lấy (cho top danh mục)',
              },
            },
          },
        },
        required: ['functionName'],
      },
    },
  ];

  /**
   * Gọi LLM Model với ngữ cảnh, System Prompt và Function Calling
   */
  async generateReply(params: {
    userMessage: string;
    systemPrompt: string;
    mascotCode: string;
    contextMessages: LlmChatContextMessage[];
    aiConfig: { provider: AiProvider; model: string; apiKey: string };
  }): Promise<LlmExecutionResult> {
    const { userMessage, systemPrompt, mascotCode, contextMessages, aiConfig } = params;

    // Timeout kiểm soát (8 giây để đảm bảo trải nghiệm người dùng)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      if (aiConfig.provider === AiProvider.OPENAI) {
        return await this.callOpenAi(
          userMessage,
          systemPrompt,
          contextMessages,
          aiConfig,
          controller.signal,
        );
      } else {
        return await this.callGemini(
          userMessage,
          systemPrompt,
          contextMessages,
          aiConfig,
          controller.signal,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Lỗi gọi LLM (${aiConfig.provider} - ${aiConfig.model}): ${err.message}. Kích hoạt Template Fallback.`,
      );
      return this.getFallbackResult(mascotCode, userMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── [GOOGLE GEMINI HANDLER] ──────────────────────────────────────────────

  private async callGemini(
    userMessage: string,
    systemPrompt: string,
    contextMessages: LlmChatContextMessage[],
    aiConfig: { model: string; apiKey: string },
    signal: AbortSignal,
  ): Promise<LlmExecutionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;

    const contents: any[] = [];
    for (const msg of contextMessages) {
      contents.push({
        role: msg.role === 'USER' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      tools: [
        {
          functionDeclarations: this.toolDeclarations,
        },
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 800,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Kiểm tra xem Gemini có gọi Function Calling không
    const functionCallPart = parts.find((p: any) => p.functionCall);
    if (functionCallPart) {
      const fn = functionCallPart.functionCall;
      return {
        text: '',
        toolCall: {
          name: fn.name,
          args: fn.args || {},
        },
        intent: fn.name === 'draft_transaction' ? AiIntent.ADD_TRANSACTION : AiIntent.QUERY_SPENDING,
      };
    }

    // Nếu là text thông thường
    const textPart = parts.find((p: any) => p.text);
    const parsed = this.parseTextIntent(textPart?.text || '', userMessage);
    return {
      text: parsed.text,
      intent: parsed.intent,
    };
  }

  // ── [OPENAI HANDLER] ───────────────────────────────────────────────────────

  private async callOpenAi(
    userMessage: string,
    systemPrompt: string,
    contextMessages: LlmChatContextMessage[],
    aiConfig: { model: string; apiKey: string },
    signal: AbortSignal,
  ): Promise<LlmExecutionResult> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of contextMessages) {
      messages.push({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
    messages.push({ role: 'user', content: userMessage });

    const openAiTools = this.toolDeclarations.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters.properties,
          required: t.parameters.required,
        },
      },
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        tools: openAiTools,
        tool_choice: 'auto',
        temperature: 0.6,
        max_tokens: 800,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const message = data.choices?.[0]?.message;

    // Kiểm tra tool_calls của OpenAI
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const fnName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        args = {};
      }
      return {
        text: '',
        toolCall: {
          name: fnName,
          args,
        },
        intent: fnName === 'draft_transaction' ? AiIntent.ADD_TRANSACTION : AiIntent.QUERY_SPENDING,
      };
    }

    const parsed = this.parseTextIntent(message?.content || '', userMessage);
    return {
      text: parsed.text,
      intent: parsed.intent,
    };
  }

  /**
   * Phân loại intent từ văn bản text khi LLM không gọi Function Calling
   */
  private parseTextIntent(
    rawText: string,
    userMessage: string,
  ): { text: string; intent: AiIntent } {
    let text = rawText || '';
    let intent: AiIntent = AiIntent.CHITCHAT;

    if (text.includes('[OUT_OF_SCOPE]')) {
      text = text.replace(/\[OUT_OF_SCOPE\]/g, '').trim();
      intent = AiIntent.OUT_OF_SCOPE;
    } else if (text.includes('[INTENT_UNCLEAR]')) {
      text = text.replace(/\[INTENT_UNCLEAR\]/g, '').trim();
      intent = AiIntent.INTENT_UNCLEAR;
    } else {
      // Heuristic fallback nếu LLM quên gắn tag nhưng câu hỏi rõ ràng nằm ngoài phạm vi
      const isOutOfScope =
        /(bitcoin|crypto|btc|eth|thời tiết|dự báo thời tiết|viết code|javascript|python|chính trị)/i.test(
          userMessage,
        );
      if (isOutOfScope) {
        intent = AiIntent.OUT_OF_SCOPE;
      } else {
        const isUnclear =
          userMessage.trim().length <= 2 ||
          /^(ơi|alo|ê|này|help|giúp|\?+|\.+)$/i.test(userMessage.trim());
        if (isUnclear) {
          intent = AiIntent.INTENT_UNCLEAR;
        }
      }
    }

    return { text, intent };
  }

  // ── [FALLBACK TEMPLATE HELPER] ─────────────────────────────────────────────

  private getFallbackResult(mascotCode: string, userMessage: string): LlmExecutionResult {
    const mascotKey = (mascotCode || AI_CHAT_CONFIG.DEFAULT_MASCOT_CODE).toLowerCase();
    const pool =
      MASCOT_TEMPLATE_POOL[mascotKey] ||
      MASCOT_TEMPLATE_POOL[AI_CHAT_CONFIG.DEFAULT_MASCOT_CODE];

    // 1. Phát hiện cơ bản ý định thêm tiền qua regex nếu LLM chết
    const moneyMatch = userMessage.match(
      /(\d+[\d\.,]*)\s*(k|nghìn|ngàn|tr|triệu|củ|đ|vnd)?/i,
    );
    const isSpending =
      /(ăn|uống|mua|tiêu|trả|chi|hết|mất|đổ xăng|bánh|cơm|cafe|trà)/i.test(
        userMessage,
      );

    if (moneyMatch && isSpending) {
      return {
        text: `${pool.confirmPrefix}\n\n*Hệ thống đang chạy chế độ dự phòng, vui lòng xác nhận giao dịch.*`,
        intent: AiIntent.ADD_TRANSACTION,
        usedFallback: true,
      };
    }

    // 2. Phát hiện câu hỏi ngoài phạm vi
    const isOutOfScope =
      /(bitcoin|crypto|btc|eth|thời tiết|dự báo thời tiết|viết code|javascript|python|chính trị)/i.test(
        userMessage,
      );
    if (isOutOfScope) {
      const outOfScopeReplies = pool.outOfScope || [
        'Tôi chỉ chuyên về quản lý tài chính cá nhân thôi bạn nhé!',
      ];
      const randomReply =
        outOfScopeReplies[Math.floor(Math.random() * outOfScopeReplies.length)];
      return {
        text: randomReply,
        intent: AiIntent.OUT_OF_SCOPE,
        usedFallback: true,
      };
    }

    // 3. Phát hiện câu hỏi mơ hồ, cụt lủn
    const isUnclear =
      userMessage.trim().length <= 2 ||
      /^(ơi|alo|ê|này|help|giúp|\?+|\.+)$/i.test(userMessage.trim());
    if (isUnclear) {
      const unclearReplies = pool.unclear || [
        'Tôi chưa hiểu rõ yêu cầu của bạn lắm. Bạn muốn chọn tính năng nào dưới đây?',
      ];
      const randomReply =
        unclearReplies[Math.floor(Math.random() * unclearReplies.length)];
      return {
        text: randomReply,
        intent: AiIntent.INTENT_UNCLEAR,
        usedFallback: true,
      };
    }

    // 4. Mặc định là chitchat
    const randomReply =
      pool.chitchat[Math.floor(Math.random() * pool.chitchat.length)];
    return {
      text: randomReply,
      intent: AiIntent.CHITCHAT,
      usedFallback: true,
    };
  }
}
