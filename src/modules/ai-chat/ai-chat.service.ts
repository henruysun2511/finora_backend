// src/modules/ai-chat/ai-chat.service.ts
import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionVisibility } from '../../common/enums/transaction-visibility.enum';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionSource } from '../transactions/enums/transaction-source.enum';
import { PhotoType } from '../transactions/enums/photo-type.enum';
import { TransactionsService } from '../transactions/transactions.service';
import { ReceiptRepository } from '../transactions/repositories/receipt.repository';
import { CloudinaryService } from '../../infrastructures/cloudinary/cloudinary.service';
import { CLOUDINARY_CONSTANTS } from '../../infrastructures/cloudinary/cloudinary.constant';
import { WalletsService } from '../wallets/wallets.service';
import { AI_CHAT_CONFIG } from './constants';
import { ChatHistoryQueryDto } from './dto/request/chat-history-query.dto';
import {
  EditTransactionDraftDto,
  ExecutePendingActionDto,
  PendingActionDecision,
} from './dto/request/execute-pending-action.dto';
import { SendMediaMessageDto } from './dto/request/send-media-message.dto';
import { SendMessageDto } from './dto/request/send-message.dto';
import { ChatMessageResponseDto } from './dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from './dto/response/pending-action-response.dto';
import { PendingAction } from './entities/pending-action.entity';
import { AiIntent } from './enums/ai-intent.enum';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { ChatRole } from './enums/chat-role.enum';
import { PendingActionStatus } from './enums/pending-action-status.enum';
import {
  AiChatInvalidAmountException,
  AiChatInvalidDateException,
  AiChatInvalidNameException,
  AiMediaRequiredException,
  AiTransactionCreateFailedException,
  AiUnsupportedMediaException,
  PendingActionAlreadyProcessedException,
  PendingActionExpiredException,
  PendingActionInvalidAccountException,
  PendingActionInvalidCategoryException,
  PendingActionNotFoundException,
} from './exceptions/ai-chat.exception';
import {
  CategoryLite,
  MascotCode,
  UploadedMedia,
  WalletAccountLite,
} from './interfaces/ai-chat.types';
import { AiChatMapper } from './mapper/ai-chat.mapper';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { PendingActionRepository } from './repositories/pending-action.repository';
import { CannedQueryRegistry } from './services/canned-query.registry';
import { CategoryClassifierService } from './services/category-classifier.service';
import { ChatRateLimiter } from './services/chat-rate-limiter.service';
import {
  IntentClassifierService,
  IntentResult,
} from './services/intent-classifier.service';
import { DashboardService } from '../dashboards/dashboards.service';
import { MascotAdviceService } from './services/mascot-advice.service';
import { MascotContextService } from './services/mascot-context.service';
import { FinancialContext, MascotToneService } from './services/mascot-tone.service';
import { OcrService } from './services/ocr.service';
import { QueryPlannerService } from './services/query-planner.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TransactionDraftService } from './services/transaction-draft.service';
import {
  isoToTransactionDate,
  isValidIsoDate,
  startOfMonth,
  todayVn,
} from './utils/date.util';
import { formatMoney, truncate } from './utils/text.util';

interface PipelineParams {
  userId: string;
  walletId: string;
  userText: string;
  userPayload?: Record<string, any> | null;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly chatMessageRepo: ChatMessageRepository,
    private readonly pendingActionRepo: PendingActionRepository,
    private readonly mapper: AiChatMapper,
    private readonly walletsService: WalletsService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly receiptRepo: ReceiptRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mascotContext: MascotContextService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly draftService: TransactionDraftService,
    private readonly categoryClassifier: CategoryClassifierService,
    private readonly queryPlanner: QueryPlannerService,
    private readonly cannedQueries: CannedQueryRegistry,
    private readonly tone: MascotToneService,
    private readonly dashboardService: DashboardService,
    private readonly adviceService: MascotAdviceService,
    private readonly stt: SpeechToTextService,
    private readonly ocr: OcrService,
    private readonly rateLimiter: ChatRateLimiter,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // GỬI TIN NHẮN
  // ═══════════════════════════════════════════════════════════════════════════

  /** Kênh chat text (hoặc text đã được client nhận diện). */
  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    this.rateLimiter.assertAllowed(userId);
    await this.walletsService.getWalletById(dto.walletId, userId);

    const source = dto.source ?? TransactionSource.CHAT_TEXT;
    return this.processText({
      userId,
      walletId: dto.walletId,
      text: dto.message,
      source,
      intentOverride: dto.intentOverride,
      userPayload:
        source === TransactionSource.CHAT_TEXT
          ? null
          : { input: String(source) },
    });
  }

  /** Kênh giọng nói (PhoWhisper) hoặc ảnh hóa đơn (VietOCR). */
  async sendMediaMessage(
    userId: string,
    dto: SendMediaMessageDto,
    file: UploadedMedia | undefined,
  ): Promise<ChatMessageResponseDto> {
    if (!file || !file.buffer || !file.buffer.length)
      throw new AiMediaRequiredException();

    const mime = (file.mimetype || '').toLowerCase();
    const isAudio = (
      AI_CHAT_CONFIG.ALLOWED_AUDIO_MIME as readonly string[]
    ).includes(mime);
    const isImage = (
      AI_CHAT_CONFIG.ALLOWED_IMAGE_MIME as readonly string[]
    ).includes(mime);
    if (!isAudio && !isImage)
      throw new AiUnsupportedMediaException(
        `Định dạng "${mime || 'không rõ'}" không được hỗ trợ`,
      );
    if (isAudio && file.size > AI_CHAT_CONFIG.MAX_AUDIO_BYTES) {
      throw new AiUnsupportedMediaException(
        `Tệp âm thanh tối đa ${AI_CHAT_CONFIG.MAX_AUDIO_BYTES / 1024 / 1024}MB`,
      );
    }
    if (isImage && file.size > AI_CHAT_CONFIG.MAX_IMAGE_BYTES) {
      throw new AiUnsupportedMediaException(
        `Ảnh tối đa ${AI_CHAT_CONFIG.MAX_IMAGE_BYTES / 1024 / 1024}MB`,
      );
    }

    this.rateLimiter.assertAllowed(userId);
    await this.walletsService.getWalletById(dto.walletId, userId);

    if (isAudio) {
      let audioUrl: string | null = null;
      try {
        const uploadRes = await this.cloudinaryService.uploadMedia(
          file,
          CLOUDINARY_CONSTANTS.FOLDERS.AUDIO,
        );
        audioUrl = uploadRes.secureUrl;
      } catch (uploadErr) {
        this.logger.warn(
          `Không thể tải tệp âm thanh lên Cloudinary: ${(uploadErr as Error)?.message}`,
        );
      }

      // STT thất bại -> 422 trước khi lưu bất cứ thứ gì
      const result = await this.stt.transcribe(file);
      return this.processText({
        userId,
        walletId: dto.walletId,
        text: result.text,
        source: TransactionSource.VOICE,
        userPayload: {
          input: 'voice',
          audioUrl,
          sttConfidence: result.confidence,
        },
      });
    }

    let imageUrl: string | null = null;
    try {
      const uploadRes = await this.cloudinaryService.uploadMedia(
        file,
        CLOUDINARY_CONSTANTS.FOLDERS.RECEIPTS,
      );
      imageUrl = uploadRes.secureUrl;
    } catch (uploadErr) {
      this.logger.warn(
        `Không thể tải ảnh hóa đơn lên Cloudinary: ${(uploadErr as Error)?.message}`,
      );
    }

    const ocr = await this.ocr.extractText(file);
    return this.runPipeline(
      {
        userId,
        walletId: dto.walletId,
        userText: 'Ảnh hóa đơn',
        userPayload: {
          input: 'receipt',
          imageUrl,
          photoUrl: imageUrl,
          ocrConfidence: ocr.confidence,
          ocrTextPreview: truncate(ocr.text, 500),
        },
      },
      (mascot) =>
        this.handleAddTransaction({
          userId,
          walletId: dto.walletId,
          mascot,
          source: TransactionSource.RECEIPT_SCAN,
          imageUrl,
          input: { kind: 'receipt', ocrText: ocr.text },
        }),
    );
  }

  private processText(p: {
    userId: string;
    walletId: string;
    text: string;
    source: TransactionSource;
    intentOverride?:
      AiIntent.ADD_TRANSACTION | AiIntent.QUERY_SPENDING | AiIntent.CHITCHAT;
    userPayload?: Record<string, any> | null;
  }): Promise<ChatMessageResponseDto> {
    return this.runPipeline(
      {
        userId: p.userId,
        walletId: p.walletId,
        userText: p.text,
        userPayload: p.userPayload,
      },
      async (mascot, systemPrompt) => {
        const intent: IntentResult = p.intentOverride
          ? { intent: p.intentOverride, confidence: 1, source: 'override' }
          : await this.intentClassifier.classify(p.text);

        this.logger.debug(
          `intent=${intent.intent} conf=${intent.confidence.toFixed(2)} via=${intent.source}`,
        );

        switch (intent.intent) {
          case AiIntent.ADD_TRANSACTION:
            return this.handleAddTransaction({
              userId: p.userId,
              walletId: p.walletId,
              mascot,
              source: p.source,
              input: { kind: 'text', text: p.text },
            });
          case AiIntent.QUERY_SPENDING:
            return this.handleQuery(
              p.userId,
              p.walletId,
              mascot,
              p.text,
              intent,
              systemPrompt,
            );
          case AiIntent.OUT_OF_SCOPE: {
            const [history, financialContext] = await Promise.all([
              this.loadRecentHistory(p.userId, p.walletId),
              this.loadFinancialContext(p.userId, p.walletId),
            ]);
            return this.replyText(
              p.userId,
              p.walletId,
              mascot,
              AiIntent.OUT_OF_SCOPE,
              await this.tone.sayGenerated(
                mascot,
                'outOfScope',
                p.text,
                systemPrompt,
                history,
                financialContext,
              ),
            );
          }
          case AiIntent.CHITCHAT: {
            const key = this.intentClassifier.isAdviceRequest(p.text)
              ? 'advice'
              : 'chitchat';
            const [history, financialContext] = await Promise.all([
              this.loadRecentHistory(p.userId, p.walletId),
              this.loadFinancialContext(p.userId, p.walletId),
            ]);
            return this.replyText(
              p.userId,
              p.walletId,
              mascot,
              AiIntent.CHITCHAT,
              await this.tone.sayGenerated(
                mascot,
                key,
                p.text,
                systemPrompt,
                history,
                financialContext,
              ),
            );
          }
          default: {
            const [history, financialContext] = await Promise.all([
              this.loadRecentHistory(p.userId, p.walletId),
              this.loadFinancialContext(p.userId, p.walletId),
            ]);
            return this.handleUnclear(
              p.userId,
              p.walletId,
              mascot,
              p.text,
              systemPrompt,
              history,
              financialContext,
            );
          }
        }
      },
    );
  }

  /**
   * Khung chung: lưu tin USER -> chạy xử lý -> lỗi "AI/logic" bất ngờ thì trả câu xin lỗi theo giọng mascot
   * (không bao giờ 500 vì AI). HttpException (404/409/422...) được giữ nguyên.
   */
  private async runPipeline(
    p: PipelineParams,
    work: (
      mascot: MascotCode,
      systemPrompt?: string,
    ) => Promise<ChatMessageResponseDto>,
  ): Promise<ChatMessageResponseDto> {
    const { code: mascot, systemPrompt } =
      await this.mascotContext.resolveWithPrompt(p.userId);

    await this.chatMessageRepo.createAndSave({
      userId: p.userId,
      walletId: p.walletId,
      role: ChatRole.USER,
      messageType: ChatMessageType.TEXT,
      textContent: p.userText,
      payloadJson: p.userPayload ?? null,
    });

    try {
      return await work(mascot, systemPrompt);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        `Lỗi xử lý tin nhắn AI: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      try {
        return await this.replyText(
          p.userId,
          p.walletId,
          mascot,
          null,
          this.tone.say(mascot, 'error'),
          { error: true },
        );
      } catch (saveErr) {
        this.logger.error(
          `Không lưu được tin nhắn lỗi: ${(saveErr as Error)?.message}`,
        );
        throw new ServiceUnavailableException({
          code: 'AI_CHAT_UNAVAILABLE',
          message:
            'Trợ lý đang tạm thời không khả dụng. Vui lòng thử lại sau ít phút.',
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁC NHÁNH
  // ═══════════════════════════════════════════════════════════════════════════

  /** Nhánh 1: trích xuất -> phân loại -> PendingAction (KHÔNG lưu giao dịch thật) -> hỏi xác nhận. */
  private async handleAddTransaction(p: {
    userId: string;
    walletId: string;
    mascot: MascotCode;
    source: TransactionSource;
    imageUrl?: string | null;
    input:
      { kind: 'text'; text: string } | { kind: 'receipt'; ocrText: string };
  }): Promise<ChatMessageResponseDto> {
    const { userId, walletId, mascot } = p;
    const { accounts, categories } = await this.loadWalletContext(
      userId,
      walletId,
    );

    const result =
      p.input.kind === 'text'
        ? await this.draftService.fromText({
            text: p.input.text,
            source: p.source,
            accounts,
            categories,
          })
        : await this.draftService.fromReceipt({
            ocrText: p.input.ocrText,
            source: p.source,
            accounts,
            categories,
          });

    if (!result.ok) {
      const reason = 'reason' in result ? result.reason : 'no_amount';
      const key = reason === 'no_amount' ? 'needAmount' : 'amountTooLarge';
      return this.replyText(
        userId,
        walletId,
        mascot,
        AiIntent.ADD_TRANSACTION,
        this.tone.say(mascot, key),
        {
          reason,
          requireManualInput: true,
        },
      );
    }

    const d = result.draft;
    let receiptId: string | null = null;

    if (p.input.kind === 'receipt') {
      try {
        const targetAccountId = d.accountId || accounts[0]?.id;
        if (targetAccountId) {
          const receipt = await this.receiptRepo.createAndSave({
            accountId: targetAccountId,
            imageUrl: p.imageUrl || '',
            merchantName: d.merchantName || d.name,
            totalAmount: d.amount,
            taxAmount: d.taxAmount ?? null,
            tipAmount: d.tipAmount ?? null,
            ocrRawData:
              d.ocrRawData ?? (p.input.ocrText ? { text: p.input.ocrText } : null),
            scannedAt: new Date(),
          });
          receiptId = receipt.id;
          d.receiptId = receiptId;
        }
      } catch (receiptErr) {
        this.logger.error(
          `Không thể tạo bản ghi Receipt: ${(receiptErr as Error)?.message}`,
        );
      }
    }

    if (p.imageUrl) {
      d.photoUrl = p.imageUrl;
    }

    const expiresAt = new Date(
      Date.now() + AI_CHAT_CONFIG.PENDING_ACTION_TTL_MINUTES * 60 * 1000,
    );
    const amountFormatted = formatMoney(d.amount, d.currency);

    const toolInput = {
      type: d.type,
      amount: d.amount,
      name: d.name,
      date: d.date,
      note: d.note,
      locationName: d.locationName ?? null,
      accountId: d.accountId,
      accountName: d.accountName,
      categoryId: d.categoryId,
      categoryName: d.categoryName,
      categoryKey: d.categoryKey,
      source: d.source,
      receiptId: d.receiptId ?? null,
      photoUrl: d.photoUrl ?? null,
      imageUrl: d.photoUrl ?? null,
    };
    const previewPayload = {
      title: 'Xác nhận ghi chép giao dịch',
      type: d.type,
      name: d.name,
      amount: d.amount,
      amountFormatted,
      currency: d.currency,
      accountId: d.accountId,
      accountName: d.accountName,
      categoryId: d.categoryId,
      categoryName: d.categoryName,
      categorySource: d.categorySource,
      categoryConfidence: d.categoryConfidence,
      suggestedNewCategory: d.suggestedNewCategory,
      date: d.date,
      note: d.note,
      locationName: d.locationName ?? null,
      source: d.source,
      receiptId: d.receiptId ?? null,
      photoUrl: d.photoUrl ?? null,
      imageUrl: d.photoUrl ?? null,
      missingFields: d.missingFields,
      warnings: d.warnings,
      expiresAt: expiresAt.toISOString(),
    };

    const pending = await this.pendingActionRepo.createAndSave({
      userId,
      walletId,
      toolName: 'draft_transaction',
      toolInput,
      previewPayload,
      expiresAt,
    });

    try {
      const message = await this.chatMessageRepo.createAndSave({
        userId,
        walletId,
        role: ChatRole.ASSISTANT,
        messageType: ChatMessageType.CONFIRMATION_PROMPT,
        textContent: this.tone.say(mascot, 'confirm', {
          name: d.name,
          amount: amountFormatted,
          category: d.categoryName ?? 'chưa phân loại',
        }),
        intent: AiIntent.ADD_TRANSACTION,
        mascot,
        payloadJson: {
          pendingActionId: pending.id,
          preview: previewPayload,
          toolInput,
        },
      });
      await this.pendingActionRepo.attachChatMessage(pending.id, message.id);
      pending.chatMessageId = message.id;
      return this.mapper.toMessageResponse(message, pending);
    } catch (err) {
      // Không để lại hành động chờ "mồ côi" không gắn với tin nhắn nào
      await this.pendingActionRepo
        .markStatus(pending.id, PendingActionStatus.REJECTED)
        .catch(() => undefined);
      throw err;
    }
  }

  /** Nhánh 2: intent -> hàm canned query được phê duyệt -> dữ liệu thật -> biểu đồ + diễn giải theo mascot. */
  private async handleQuery(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    text: string,
    intent: IntentResult,
    systemPrompt?: string,
  ): Promise<ChatMessageResponseDto> {
    const categories = (
      await this.loadWalletContext(userId, walletId).catch(() => ({
        categories: [] as CategoryLite[],
      }))
    ).categories;
    const plan = await this.queryPlanner.plan(
      text,
      categories,
      intent.queryHint,
    );

    const result = this.cannedQueries.isSupported(plan.functionName)
      ? await this.cannedQueries.execute({
          plan,
          userId,
          walletId,
          mascot,
          userText: text,
          systemPrompt,
        })
      : this.cannedQueries.unsupported(mascot);

    const message = await this.chatMessageRepo.createAndSave({
      userId,
      walletId,
      role: ChatRole.ASSISTANT,
      messageType: result.messageType,
      textContent: result.textContent,
      intent: AiIntent.QUERY_SPENDING,
      mascot,
      payloadJson: result.payloadJson,
    });
    return this.mapper.toMessageResponse(message);
  }

  /** Nhánh 5: hỏi lại người dùng + gợi ý tuỳ chọn (client gửi lại kèm intentOverride). */
  private handleUnclear(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    text: string,
    systemPrompt?: string,
    history?: Array<{ role: string; content: string }>,
    financialContext?: FinancialContext,
  ): Promise<ChatMessageResponseDto> {
    const actions = [
      { label: 'Ghi chép giao dịch mới', intent: AiIntent.ADD_TRANSACTION },
      {
        label: 'Báo cáo chi tiêu tháng này',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Chi tiêu tháng này của tôi',
      },
      {
        label: 'Kiểm tra tiến độ ngân sách',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Tình hình ngân sách tháng này thế nào',
      },
      {
        label: 'Đánh giá quy tắc 50/30/20',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Đánh giá chi tiêu theo quy tắc 50 30 20',
      },
      {
        label: 'Tra cứu số dư ví',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Số dư các tài khoản của tôi',
      },
      {
        label: 'Thói quen chi tiêu theo ngày',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Thói quen chi tiêu của tôi thế nào',
      },
      {
        label: 'Sổ nợ & khoản cho vay',
        intent: AiIntent.QUERY_SPENDING,
        message: 'Sổ nợ và các khoản cho vay của tôi',
      },
      {
        label: 'Xin lời khuyên từ Mascot',
        intent: AiIntent.CHITCHAT,
        message: 'Cho tôi lời khuyên tài chính',
      },
    ];
    return this.tone
      .sayGenerated(
        mascot,
        'unclear',
        text,
        systemPrompt,
        history,
        financialContext,
      )
      .then((reply) =>
        this.replyText(
          userId,
          walletId,
          mascot,
          AiIntent.INTENT_UNCLEAR,
          reply,
          {
            clarifyOptions: actions.map((a) => a.label),
            clarifyActions: actions,
            originalMessage: text,
          },
        ),
      );
  }

  /** Lấy lịch sử trò chuyện gần nhất (dạng chronological user/model) phục vụ multi-turn chat. */
  private async loadRecentHistory(
    userId: string,
    walletId: string,
    limit = 6,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const recent = await this.chatMessageRepo.findByWalletPaged(
        walletId,
        userId,
        limit + 1,
      );
      if (!recent || recent.length <= 1) return [];
      // Bỏ qua tin nhắn mới nhất vừa được lưu trong runPipeline (index 0), đảo ngược về thứ tự cũ -> mới
      return recent
        .slice(1)
        .reverse()
        .filter((m) => m.textContent && m.textContent.trim().length > 0)
        .map((m) => ({
          role: m.role === ChatRole.USER ? 'user' : 'model',
          content: m.textContent.trim(),
        }));
    } catch (err) {
      this.logger.warn(
        `Không thể lấy lịch sử chat gần nhất: ${(err as Error)?.message}`,
      );
      return [];
    }
  }

  /** Lấy nhanh bối cảnh tài chính (số dư ví, ngân sách tháng, tổng chi tiêu, tài sản ròng). */
  private async loadFinancialContext(
    userId: string,
    walletId: string,
  ): Promise<FinancialContext> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [overview, budgetHealth] = await Promise.all([
        this.dashboardService
          .getExecutiveOverview(userId, { walletId })
          .catch(() => null),
        this.dashboardService
          .getBudgetHealth(userId, { walletId, month: currentMonth })
          .catch(() => null),
      ]);

      const balance =
        overview?.accountsSummary?.reduce(
          (sum, a) => sum + (Number(a.balance) || 0),
          0,
        ) ?? overview?.netWorth;

      return {
        balance: balance !== undefined ? Number(balance) : undefined,
        netWorth:
          overview?.netWorth !== undefined
            ? Number(overview.netWorth)
            : undefined,
        monthlyBudget:
          budgetHealth?.totalBudgetLimit && budgetHealth.totalBudgetLimit > 0
            ? Number(budgetHealth.totalBudgetLimit)
            : undefined,
        monthlySpent:
          budgetHealth?.totalSpent !== undefined
            ? Number(budgetHealth.totalSpent)
            : overview?.monthlyCashflow?.expense !== undefined
              ? Number(overview.monthlyCashflow.expense)
              : undefined,
      };
    } catch (err) {
      this.logger.warn(
        `Không thể nạp bối cảnh tài chính: ${(err as Error)?.message}`,
      );
      return {};
    }
  }

  private async replyText(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    intent: AiIntent | null,
    text: string,
    payloadJson: Record<string, any> | null = null,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.chatMessageRepo.createAndSave({
      userId,
      walletId,
      role: ChatRole.ASSISTANT,
      messageType: ChatMessageType.TEXT,
      textContent: text,
      intent,
      mascot,
      payloadJson,
    });
    return this.mapper.toMessageResponse(message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // XÁC NHẬN / TỪ CHỐI HÀNH ĐỘNG CHỜ
  // ═══════════════════════════════════════════════════════════════════════════

  async executePendingAction(
    userId: string,
    actionId: string,
    dto: ExecutePendingActionDto,
  ): Promise<PendingActionResponseDto> {
    type Outcome =
      | { kind: 'processed'; status: string }
      | { kind: 'expired' }
      | { kind: 'rejected'; action: PendingAction }
      | {
          kind: 'confirmed';
          action: PendingAction;
          transactionId: string;
          draft: ValidatedDraft;
        };

    // Khoá hàng + xử lý trong 1 transaction: bấm 2 lần cùng lúc chỉ tạo đúng 1 giao dịch.
    const outcome = await this.pendingActionRepo.withLock<Outcome>(
      actionId,
      userId,
      async (action, manager) => {
        if (action.status !== PendingActionStatus.PENDING)
          return { kind: 'processed', status: action.status };

        if (new Date() > new Date(action.expiresAt)) {
          await this.pendingActionRepo.markStatus(
            actionId,
            PendingActionStatus.EXPIRED,
            null,
            manager,
          );
          return { kind: 'expired' };
        }

        if (dto.action === PendingActionDecision.REJECT) {
          await this.pendingActionRepo.markStatus(
            actionId,
            PendingActionStatus.REJECTED,
            null,
            manager,
          );
          action.status = PendingActionStatus.REJECTED;
          return { kind: 'rejected', action };
        }

        // CONFIRM: kiểm tra đầy đủ -> lỗi ở đây sẽ rollback, hành động vẫn PENDING để người dùng sửa và thử lại
        const draft = await this.validateDraft(userId, action, dto.editedData);
        let transactionId: string;
        try {
          const created = await this.transactionsService.createTransaction(
            userId,
            {
              accountId: draft.accountId,
              categoryId: draft.categoryId,
              receiptId: draft.receiptId ?? undefined,
              type: draft.type,
              amount: draft.amount,
              name: draft.name,
              note: draft.note ?? undefined,
              transactionDate: isoToTransactionDate(draft.date),
              source: draft.source,
              locationName: draft.locationName ?? undefined,
              visibility: draft.visibility,
              amountHidden: draft.amountHidden,
              excludeFromReport: draft.excludeFromReport,
              photoUrl: draft.photoUrl ?? undefined,
              photoType:
                draft.receiptId || draft.photoUrl
                  ? PhotoType.RECEIPT
                  : undefined,
            } as any,
          );
          transactionId = created.id;
        } catch (err) {
          if (err instanceof HttpException) throw err; // lỗi nghiệp vụ của TransactionsService (số dư, tài khoản khoá...)
          this.logger.error(
            `Tạo giao dịch từ PendingAction ${actionId} thất bại: ${(err as Error)?.message}`,
            (err as Error)?.stack,
          );
          throw new AiTransactionCreateFailedException();
        }

        await this.pendingActionRepo.markStatus(
          actionId,
          PendingActionStatus.CONFIRMED,
          transactionId,
          manager,
        );
        action.status = PendingActionStatus.CONFIRMED;
        action.transactionId = transactionId;
        return { kind: 'confirmed', action, transactionId, draft };
      },
    );

    if (!outcome) throw new PendingActionNotFoundException(actionId);
    if (outcome.kind === 'processed')
      throw new PendingActionAlreadyProcessedException(outcome.status);
    if (outcome.kind === 'expired') throw new PendingActionExpiredException();

    const mascot = await this.mascotContext.resolve(userId);
    const walletId = outcome.action.walletId;

    if (outcome.kind === 'rejected') {
      const msg = await this.safeReply(
        userId,
        walletId,
        mascot,
        AiIntent.ADD_TRANSACTION,
        this.tone.say(mascot, 'rejected'),
        {
          pendingActionId: actionId,
          result: 'rejected',
        },
      );
      return this.mapper.toPendingActionResponse(outcome.action, msg);
    }

    // Đã lưu thành công -> kiểm tra lời khuyên (không chặn, không làm hỏng luồng chính)
    const advice = await this.findAdvice(
      userId,
      walletId,
      mascot,
      outcome.draft,
    );
    const savedText = this.tone.say(mascot, 'saved', {
      name: outcome.draft.name,
      amount: formatMoney(outcome.draft.amount, outcome.draft.currency),
    });
    const msg = await this.safeReply(
      userId,
      walletId,
      mascot,
      AiIntent.ADD_TRANSACTION,
      advice ? `${savedText}\n${advice.message}` : savedText,
      {
        pendingActionId: actionId,
        result: 'confirmed',
        transactionId: outcome.transactionId,
        advice: advice ?? null,
        transaction: {
          id: outcome.transactionId,
          type: outcome.draft.type,
          name: outcome.draft.name,
          amount: outcome.draft.amount,
          categoryName: outcome.draft.categoryName,
          date: outcome.draft.date,
        },
      },
    );
    return this.mapper.toPendingActionResponse(outcome.action, msg);
  }

  async getPendingAction(
    userId: string,
    actionId: string,
  ): Promise<PendingActionResponseDto> {
    const action = await this.pendingActionRepo.findByIdAndUser(
      actionId,
      userId,
    );
    if (!action) throw new PendingActionNotFoundException(actionId);
    return this.mapper.toPendingActionResponse(action);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LỊCH SỬ
  // ═══════════════════════════════════════════════════════════════════════════

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
    const confirmIds = list
      .filter((m) => m.messageType === ChatMessageType.CONFIRMATION_PROMPT)
      .map((m) => m.id);
    const pendings = await this.pendingActionRepo.findByChatMessageIds(
      confirmIds,
      userId,
    );
    return this.mapper.toMessageListResponse(list, pendings);
  }

  async clearHistory(
    userId: string,
    walletId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.walletsService.getWalletById(walletId, userId);
    await this.pendingActionRepo.rejectPendingByWallet(walletId, userId);
    await this.chatMessageRepo.deleteByWallet(walletId, userId);
    return {
      success: true,
      message: 'Đã xóa toàn bộ lịch sử trò chuyện trong ví thành công',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadWalletContext(
    userId: string,
    walletId: string,
  ): Promise<{ accounts: WalletAccountLite[]; categories: CategoryLite[] }> {
    const [accountsPage, rawCategories] = await Promise.all([
      this.accountsService.listAccounts(userId, {
        walletId,
        page: 1,
        limit: 100,
        isArchived: false,
      } as any),
      this.categoriesService.getCategories(userId, {} as any),
    ]);
    const accounts: WalletAccountLite[] = (
      (accountsPage as any)?.items ?? []
    ).map((a: any) => ({
      id: a.id,
      name: String(a.name ?? ''),
      balance: Number(a.balance) || 0,
      currency: a.currency || 'VND',
    }));
    const categories: CategoryLite[] = (
      Array.isArray(rawCategories) ? rawCategories : []
    ).map((c: any) => ({
      id: c.id,
      name: String(c.name ?? ''),
      type: c.type as TransactionType,
    }));
    return { accounts, categories };
  }

  /** Gộp dữ liệu người dùng chỉnh sửa lên bản nháp, rồi kiểm tra chặt trước khi tạo giao dịch thật. */
  private async validateDraft(
    userId: string,
    action: PendingAction,
    edited?: EditTransactionDraftDto,
  ): Promise<ValidatedDraft> {
    const input = action.toolInput || {};
    const edit = edited || {};

    const rawType = edit.type !== undefined ? String(edit.type) : String(input.type);
    const type = (Object.values(TransactionType) as string[]).includes(rawType)
      ? (rawType as TransactionType)
      : TransactionType.EXPENSE;

    const amount =
      edit.amount !== undefined ? Number(edit.amount) : Number(input.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > AI_CHAT_CONFIG.MAX_TRANSACTION_AMOUNT
    ) {
      throw new AiChatInvalidAmountException(
        `Số tiền phải lớn hơn 0 và không vượt quá ${AI_CHAT_CONFIG.MAX_TRANSACTION_AMOUNT.toLocaleString('vi-VN')}`,
      );
    }

    const name = truncate(
      String(edit.name ?? input.name ?? '').trim(),
      AI_CHAT_CONFIG.MAX_TRANSACTION_NAME_LENGTH,
    );
    if (!name) throw new AiChatInvalidNameException();

    const date = String(edit.date ?? input.date ?? todayVn());
    if (!isValidIsoDate(date) || date > todayVn())
      throw new AiChatInvalidDateException();

    const accountId = edit.accountId ?? input.accountId ?? null;
    const categoryId = edit.categoryId ?? input.categoryId ?? null;
    if (!accountId)
      throw new PendingActionInvalidAccountException(
        'Vui lòng chọn tài khoản thanh toán trước khi lưu',
      );
    if (!categoryId)
      throw new PendingActionInvalidCategoryException(
        'Vui lòng chọn danh mục trước khi lưu',
      );

    const { accounts, categories } = await this.loadWalletContext(
      userId,
      action.walletId,
    );
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new PendingActionInvalidAccountException();
    const category = categories.find((c) => c.id === categoryId);
    if (!category)
      throw new PendingActionInvalidCategoryException('Danh mục không tồn tại');
    if (category.type !== type)
      throw new PendingActionInvalidCategoryException(
        'Danh mục không khớp với loại giao dịch (thu/chi)',
      );

    const rawSource = String(input.source ?? TransactionSource.CHAT_TEXT);
    const source = (Object.values(TransactionSource) as string[]).includes(
      rawSource,
    )
      ? (rawSource as TransactionSource)
      : TransactionSource.CHAT_TEXT;

    const note = edit.note !== undefined ? edit.note : (input.note ?? null);
    const locationName =
      edit.locationName !== undefined
        ? edit.locationName
          ? String(edit.locationName).trim()
          : null
        : (input.locationName ?? null);
    const visibility =
      edit.visibility ?? input.visibility ?? TransactionVisibility.PRIVATE;
    const amountHidden =
      edit.amountHidden !== undefined
        ? Boolean(edit.amountHidden)
        : Boolean(input.amountHidden ?? false);
    const excludeFromReport =
      edit.excludeFromReport !== undefined
        ? Boolean(edit.excludeFromReport)
        : Boolean(input.excludeFromReport ?? false);
    const photoUrl =
      edit.photoUrl !== undefined ? edit.photoUrl : (input.photoUrl ?? null);
    const receiptId =
      edit.receiptId !== undefined ? edit.receiptId : (input.receiptId ?? null);

    const categoryKey: string | null =
      category.id === input.categoryId && input.categoryKey
        ? String(input.categoryKey)
        : this.categoryClassifier.keyOfCategory(category, type);

    return {
      type,
      amount,
      name,
      date,
      note: note ? String(note) : null,
      source,
      accountId: account.id,
      currency: account.currency || 'VND',
      categoryId: category.id,
      categoryName: category.name,
      categoryKey,
      locationName,
      visibility,
      amountHidden,
      excludeFromReport,
      photoUrl,
      receiptId,
    };
  }

  /** Lời khuyên của mascot — mọi lỗi đều bị nuốt, không ảnh hưởng giao dịch đã lưu. */
  private async findAdvice(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    draft: ValidatedDraft,
  ): Promise<{ ruleId: string; message: string } | null> {
    try {
      let monthExpense: number | null = null;
      let monthIncome: number | null = null;
      if (this.adviceService.needsMonthTotals(mascot)) {
        const today = todayVn();
        const s = await this.cannedQueries.summarizeRange(
          userId,
          walletId,
          startOfMonth(today),
          today,
        );
        monthExpense = s.totalExpense;
        monthIncome = s.totalIncome;
      }
      return this.adviceService.findAdvice({
        mascot,
        type: draft.type,
        amount: draft.amount,
        categoryKey: draft.categoryKey,
        monthExpense,
        monthIncome,
      });
    } catch (err) {
      this.logger.warn(
        `Không tính được lời khuyên: ${(err as Error)?.message}`,
      );
      return null;
    }
  }

  /** Lưu tin nhắn mascot sau khi giao dịch đã xử lý xong; lỗi lưu tin KHÔNG được làm hỏng kết quả đã thành công. */
  private async safeReply(
    userId: string,
    walletId: string,
    mascot: MascotCode,
    intent: AiIntent,
    text: string,
    payload: Record<string, any>,
  ): Promise<ChatMessageResponseDto | null> {
    try {
      return await this.replyText(
        userId,
        walletId,
        mascot,
        intent,
        text,
        payload,
      );
    } catch (err) {
      this.logger.error(
        `Không lưu được tin nhắn phản hồi sau xử lý: ${(err as Error)?.message}`,
      );
      return null;
    }
  }
}

interface ValidatedDraft {
  type: TransactionType;
  amount: number;
  name: string;
  date: string;
  note: string | null;
  source: TransactionSource;
  accountId: string;
  currency: string;
  categoryId: string;
  categoryName: string;
  categoryKey: string | null;
  locationName: string | null;
  visibility: TransactionVisibility;
  amountHidden: boolean;
  excludeFromReport: boolean;
  photoUrl: string | null;
  receiptId?: string | null;
}
