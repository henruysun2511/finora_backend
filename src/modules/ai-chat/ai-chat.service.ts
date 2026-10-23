// src/modules/ai-chat/ai-chat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { PendingActionRepository } from './repositories/pending-action.repository';
import {
  LlmService,
  LlmChatContextMessage,
  LlmToolCall,
} from './services/llm.service';
import { AiChatMapper } from './mapper/ai-chat.mapper';
import { WalletsService } from '../wallets/wallets.service';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { MascotsService } from '../mascots/mascots.service';
import { SettingsService } from '../settings/settings.service';
import { SendMessageDto } from './dto/request/send-message.dto';
import {
  ExecutePendingActionDto,
  PendingActionDecision,
} from './dto/request/execute-pending-action.dto';
import { ChatHistoryQueryDto } from './dto/request/chat-history-query.dto';
import { ChatMessageResponseDto } from './dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from './dto/response/pending-action-response.dto';
import { ChatRole } from './enums/chat-role.enum';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { PendingActionStatus } from './enums/pending-action-status.enum';
import { AiIntent } from './enums/ai-intent.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionSource } from '../transactions/enums/transaction-source.enum';
import {
  PendingActionNotFoundException,
  PendingActionExpiredException,
  PendingActionAlreadyProcessedException,
  PendingActionInvalidAccountException,
  PendingActionInvalidCategoryException,
} from './exceptions/ai-chat.exception';
import { AI_CHAT_CONFIG, MASCOT_TEMPLATE_POOL } from './ai-chat.constant';
import {
  CannedQueryRegistry,
  CannedQueryFunction,
} from './services/canned-query.registry';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly chatMessageRepo: ChatMessageRepository,
    private readonly pendingActionRepo: PendingActionRepository,
    private readonly llmService: LlmService,
    private readonly mapper: AiChatMapper,
    private readonly walletsService: WalletsService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly mascotsService: MascotsService,
    private readonly settingsService: SettingsService,
    private readonly cannedQueryRegistry: CannedQueryRegistry,
  ) {}

  /**
   * Gửi tin nhắn đến AI Chatbot và nhận phản hồi thông minh
   */
  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    // 1. Kiểm tra quyền truy cập ví của người dùng
    await this.walletsService.getWalletById(dto.walletId, userId);

    // 2. Lưu tin nhắn của USER vào CSDL
    await this.chatMessageRepo.createAndSave({
      userId,
      walletId: dto.walletId,
      role: ChatRole.USER,
      messageType: ChatMessageType.TEXT,
      textContent: dto.message,
    });

    // 3. Lấy cấu hình AI và thiết lập người dùng
    const aiConfig = await this.settingsService.getEffectiveAiConfig(userId);
    const userSettings = await this.settingsService.getSettings(userId);
    const mascotData = await this.mascotsService.getCurrentUserMascot(userId);

    // Van an toàn `show_mascot` theo tài liệu ai-flow.md: nếu tắt, dùng tông Nora trung tính
    let mascotCode =
      mascotData?.mascot?.tierName?.toLowerCase() || AI_CHAT_CONFIG.DEFAULT_MASCOT_CODE;
    let systemPrompt = '';

    if (userSettings && userSettings.showMascot === false) {
      mascotCode = 'nora';
      systemPrompt =
        'Bạn là Nora, trợ lý tài chính trung tính, khách quan của Finora. ' +
        'Hãy đưa ra câu trả lời thực tế, ngắn gọn, lịch sự, không phán xét, không trào phúng.';
    } else {
      systemPrompt = await this.mascotsService.getSystemPromptForUser(userId);
    }

    // 4. Lấy ngữ cảnh hội thoại (10 tin nhắn gần nhất)
    const recentMessages = await this.chatMessageRepo.findRecentContext(
      dto.walletId,
      userId,
      AI_CHAT_CONFIG.CHAT_CONTEXT_LIMIT,
    );
    const contextMessages: LlmChatContextMessage[] = recentMessages.map((m) => ({
      role: m.role,
      content: m.textContent,
    }));

    // 5. Bổ sung danh sách tài khoản & danh mục vào System Prompt để LLM mapping chính xác
    const [accountsPage, categories] = await Promise.all([
      this.accountsService.listAccounts(userId, {
        walletId: dto.walletId,
        page: 1,
        limit: 100,
        isArchived: false,
      } as any),
      this.categoriesService.getCategories(userId, {} as any),
    ]);

    const accounts = accountsPage.items || [];
    const accountsInfo = accounts
      .map((a) => `${a.name} (ID: ${a.id}, Số dư: ${a.balance} ${a.currency})`)
      .join(', ');
    const categoriesInfo = categories
      .map((c) => `${c.name} (Loại: ${c.type}, ID: ${c.id})`)
      .join(', ');

    const cannedQueriesInfo = this.cannedQueryRegistry
      .getDefinitions()
      .map((d) => `- ${d.name}: ${d.description}`)
      .join('\n');

    const enrichedSystemPrompt =
      `${systemPrompt}\n\n` +
      `[NGỮ CẢNH DỮ LIỆU VÍ CỦA NGƯỜI DÙNG]:\n` +
      `- Danh sách tài khoản trong ví: ${accountsInfo || 'Chưa có tài khoản'}\n` +
      `- Danh sách danh mục trong hệ thống: ${categoriesInfo || 'Chưa có danh mục'}\n` +
      `- Hãy ưu tiên chọn đúng tên tài khoản và tên danh mục có trong danh sách trên khi gọi công cụ.\n\n` +
      `[DANH MỤC HÀM TRUY VẤN SỐ LIỆU ĐƯỢC HỆ THỐNG HỖ TRỢ (CANNED QUERIES)]:\n` +
      `${cannedQueriesInfo}\n\n` +
      `[QUY TẮC NHẬN DIỆN VÀ PHẢN HỒI Ý ĐỊNH]:\n` +
      `1. Thêm/ghi chép giao dịch (thu/chi): HÃY GỌI CÔNG CỤ draft_transaction.\n` +
      `2. Truy vấn số liệu tài chính: HÃY GỌI CÔNG CỤ execute_canned_query và chọn đúng tên hàm trong danh mục Canned Queries ở trên. Nếu người dùng hỏi một chức năng tra cứu ngoài danh mục (ví dụ giá vàng, chứng khoán, thuế), hãy trả lời thẳng thắn là hệ thống chưa hỗ trợ chức năng này.\n` +
      `3. Câu hỏi ngoài phạm vi tài chính (tiền ảo crypto/bitcoin, thời tiết, lập trình, công nghệ, ăn gì ngon...): Hãy từ chối trả lời khéo léo theo đúng giọng điệu linh thú và nhắc nhở người dùng quay lại quản lý chi tiêu. Bắt đầu câu trả lời bằng tiền tố [OUT_OF_SCOPE].\n` +
      `4. Câu nói cụt lủn, mơ hồ, không rõ nghĩa ("?", "tiền", "giúp"): Hãy hỏi lại người dùng một cách thân thiện theo tính cách linh thú để làm rõ. Bắt đầu câu trả lời bằng tiền tố [INTENT_UNCLEAR].\n` +
      `5. Trò chuyện, chào hỏi, xin lời khuyên tài chính: Trả lời tự nhiên theo đúng tính cách linh thú.`;

    // 6. Gửi hội thoại sang LLM Engine
    const llmResult = await this.llmService.generateReply({
      userMessage: dto.message,
      systemPrompt: enrichedSystemPrompt,
      mascotCode,
      contextMessages,
      aiConfig,
    });

    // 7. Xử lý phản hồi theo từng nhánh Tool / Intent
    if (llmResult.toolCall) {
      if (llmResult.toolCall.name === 'draft_transaction') {
        return this.handleDraftTransaction({
          userId,
          walletId: dto.walletId,
          mascotCode,
          args: llmResult.toolCall.args,
          accounts,
          categories,
          userPrompt: dto.message,
        });
      }

      // Nhánh Canned Query: Thực thi truy vấn tài chính đã được cấp phép
      if (
        llmResult.toolCall.name === 'execute_canned_query' ||
        llmResult.toolCall.name === 'query_spending_summary' ||
        llmResult.toolCall.name === 'query_wallet_balances'
      ) {
        return this.handleCannedQuery({
          userId,
          walletId: dto.walletId,
          mascotCode,
          toolCall: llmResult.toolCall,
        });
      }
    }

    // Nhánh phản hồi văn bản (Chitchat, Out-of-scope, Làm rõ ý định)
    let payloadJson: Record<string, any> | null = null;
    if (llmResult.intent === AiIntent.INTENT_UNCLEAR) {
      payloadJson = {
        clarifyOptions: [
          'Ghi chép giao dịch mới',
          'Xem báo cáo chi tiêu tháng này',
          'Tra cứu số dư tài khoản',
          'Tư vấn mẹo tiết kiệm',
        ],
      };
    }

    const assistantMessage = await this.chatMessageRepo.createAndSave({
      userId,
      walletId: dto.walletId,
      role: ChatRole.ASSISTANT,
      messageType: ChatMessageType.TEXT,
      textContent: llmResult.text,
      intent: llmResult.intent || AiIntent.CHITCHAT,
      mascot: mascotCode,
      payloadJson,
    });

    return this.mapper.toMessageResponse(assistantMessage);
  }

  /**
   * Xử lý xác nhận hoặc từ chối hành động giao dịch do AI đề xuất (Pending Action)
   */
  async executePendingAction(
    userId: string,
    actionId: string,
    dto: ExecutePendingActionDto,
  ): Promise<PendingActionResponseDto> {
    const action = await this.pendingActionRepo.findByIdAndUser(actionId, userId);
    if (!action) {
      throw new PendingActionNotFoundException(actionId);
    }

    if (action.status !== PendingActionStatus.PENDING) {
      throw new PendingActionAlreadyProcessedException(action.status);
    }

    if (new Date() > new Date(action.expiresAt)) {
      await this.pendingActionRepo.markStatus(actionId, PendingActionStatus.EXPIRED);
      throw new PendingActionExpiredException();
    }

    // Trường hợp 1: Người dùng HỦY bỏ
    if (dto.action === PendingActionDecision.REJECT) {
      const updated = await this.pendingActionRepo.markStatus(
        actionId,
        PendingActionStatus.REJECTED,
      );
      return this.mapper.toPendingActionResponse(updated!);
    }

    // Trường hợp 2: Người dùng XÁC NHẬN (có thể kèm dữ liệu chỉnh sửa)
    const toolInput = action.toolInput || {};
    const edited = dto.editedData || {};

    const amount = edited.amount !== undefined ? Number(edited.amount) : Number(toolInput.amount);
    const name = edited.name || toolInput.name || 'Giao dịch';
    const accountId = edited.accountId || toolInput.accountId;
    const categoryId = edited.categoryId || toolInput.categoryId;
    const note = edited.note !== undefined ? edited.note : toolInput.note;
    const type = (toolInput.type as TransactionType) || TransactionType.EXPENSE;
    const transactionDate = edited.date ? new Date(edited.date) : (toolInput.date ? new Date(toolInput.date) : new Date());

    if (!accountId) {
      throw new PendingActionInvalidAccountException();
    }

    if (!categoryId) {
      throw new PendingActionInvalidCategoryException();
    }

    // Tạo giao dịch thật qua TransactionsService
    const createdTx = await this.transactionsService.createTransaction(userId, {
      accountId,
      categoryId,
      type,
      amount,
      name,
      note,
      transactionDate,
      source: TransactionSource.CHAT_TEXT,
    });

    // Cập nhật trạng thái PendingAction sang CONFIRMED và lưu ID giao dịch
    const updated = await this.pendingActionRepo.markStatus(
      actionId,
      PendingActionStatus.CONFIRMED,
      createdTx.id,
    );

    return this.mapper.toPendingActionResponse(updated!);
  }

  /**
   * Lấy lịch sử tin nhắn trong ví (phân trang dạng cursor)
   */
  async getHistory(
    userId: string,
    query: ChatHistoryQueryDto,
  ): Promise<ChatMessageResponseDto[]> {
    await this.walletsService.getWalletById(query.walletId, userId);
    const list = await this.chatMessageRepo.findByWalletPaged(
      query.walletId,
      userId,
      query.limit,
      query.beforeId,
    );
    return this.mapper.toMessageListResponse(list);
  }

  /**
   * Xóa toàn bộ lịch sử tin nhắn trong ví
   */
  async clearHistory(
    userId: string,
    walletId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.walletsService.getWalletById(walletId, userId);
    await this.chatMessageRepo.deleteByWallet(walletId, userId);
    return {
      success: true,
      message: 'Đã xóa toàn bộ lịch sử trò chuyện trong ví thành công',
    };
  }

  // ── [PRIVATE HELPER HANDLERS] ──────────────────────────────────────────────

  /**
   * Xử lý Nhánh 1: Soạn giao dịch nháp và tạo Pending Action
   */
  private async handleDraftTransaction(params: {
    userId: string;
    walletId: string;
    mascotCode: string;
    args: Record<string, any>;
    accounts: any[];
    categories: any[];
    userPrompt: string;
  }): Promise<ChatMessageResponseDto> {
    const { userId, walletId, mascotCode, args, accounts, categories } = params;

    const amount = Number(args.amount) || 0;
    const type = args.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const name = args.name || (type === TransactionType.INCOME ? 'Khoản thu mới' : 'Khoản chi mới');

    // Tìm tài khoản phù hợp nhất trong ví
    let matchedAccount = accounts[0];
    if (args.accountName) {
      const found = accounts.find((a) =>
        a.name.toLowerCase().includes(args.accountName.toLowerCase()),
      );
      if (found) matchedAccount = found;
    }

    // Tìm danh mục phù hợp nhất
    let matchedCategory = categories.find((c) => c.type === type);
    if (args.categoryName) {
      const found = categories.find(
        (c) =>
          c.type === type &&
          c.name.toLowerCase().includes(args.categoryName.toLowerCase()),
      );
      if (found) matchedCategory = found;
    }

    const toolInput = {
      type,
      amount,
      name,
      accountId: matchedAccount?.id || null,
      accountName: matchedAccount?.name || 'Tài khoản mặc định',
      categoryId: matchedCategory?.id || null,
      categoryName: matchedCategory?.name || 'Chưa phân loại',
      date: args.date || new Date().toISOString().split('T')[0],
      note: args.note || null,
    };

    const previewPayload = {
      title: 'Xác nhận ghi chép giao dịch',
      type,
      name,
      amount,
      amountFormatted: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: matchedAccount?.currency || 'VND',
      }).format(amount),
      accountName: toolInput.accountName,
      categoryName: toolInput.categoryName,
      date: toolInput.date,
      note: toolInput.note,
    };

    // Tạo Pending Action có hạn 15 phút
    const expiresAt = new Date(
      Date.now() + AI_CHAT_CONFIG.PENDING_ACTION_TTL_MINUTES * 60 * 1000,
    );
    const pendingAction = await this.pendingActionRepo.createAndSave({
      userId,
      walletId,
      toolName: 'draft_transaction',
      toolInput,
      previewPayload,
      expiresAt,
    });

    const pool = MASCOT_TEMPLATE_POOL[mascotCode] || MASCOT_TEMPLATE_POOL.nora;
    const confirmText = `${pool.confirmPrefix}\n\n- **Giao dịch**: ${name}\n- **Số tiền**: ${previewPayload.amountFormatted}\n- **Danh mục**: ${previewPayload.categoryName}\n- **Tài khoản**: ${previewPayload.accountName}`;

    // Lưu tin nhắn trợ lý loại CONFIRMATION_PROMPT
    const assistantMessage = await this.chatMessageRepo.createAndSave({
      userId,
      walletId,
      role: ChatRole.ASSISTANT,
      messageType: ChatMessageType.CONFIRMATION_PROMPT,
      textContent: confirmText,
      intent: AiIntent.ADD_TRANSACTION,
      mascot: mascotCode,
      payloadJson: {
        pendingActionId: pendingAction.id,
        preview: previewPayload,
        toolInput,
      },
    });

    // Cập nhật ngược chatMessageId vào pendingAction
    await this.pendingActionRepo.markStatus(pendingAction.id, PendingActionStatus.PENDING);

    return this.mapper.toMessageResponse(assistantMessage);
  }

  /**
   * Xử lý Nhánh 2: Truy vấn dữ liệu tài chính qua CannedQueryRegistry
   */
  private async handleCannedQuery(params: {
    userId: string;
    walletId: string;
    mascotCode: string;
    toolCall: LlmToolCall;
  }): Promise<ChatMessageResponseDto> {
    const { userId, walletId, mascotCode, toolCall } = params;

    let functionName = toolCall.args?.functionName;
    const queryArgs = toolCall.args?.parameters || toolCall.args || {};

    // Hỗ trợ ngược nếu tool cũ trả thẳng tên
    if (toolCall.name === 'query_spending_summary') {
      functionName = CannedQueryFunction.GET_SPENDING_SUMMARY;
    } else if (toolCall.name === 'query_wallet_balances') {
      functionName = CannedQueryFunction.GET_WALLET_BALANCES;
    }

    const queryResult = await this.cannedQueryRegistry.execute({
      functionName: functionName || '',
      args: queryArgs,
      userId,
      walletId,
      mascotCode,
    });

    const assistantMessage = await this.chatMessageRepo.createAndSave({
      userId,
      walletId,
      role: ChatRole.ASSISTANT,
      messageType: queryResult.messageType,
      textContent: queryResult.textContent,
      intent: AiIntent.QUERY_SPENDING,
      mascot: mascotCode,
      payloadJson: queryResult.payloadJson,
    });

    return this.mapper.toMessageResponse(assistantMessage);
  }
}
