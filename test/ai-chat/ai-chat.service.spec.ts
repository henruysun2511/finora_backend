import { AiChatService } from '../../src/modules/ai-chat/ai-chat.service';
import { ChatMessageRepository } from '../../src/modules/ai-chat/repositories/chat-message.repository';
import { PendingActionRepository } from '../../src/modules/ai-chat/repositories/pending-action.repository';
import { AiChatMapper } from '../../src/modules/ai-chat/mapper/ai-chat.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { MascotContextService } from '../../src/modules/ai-chat/services/mascot-context.service';
import { IntentClassifierService } from '../../src/modules/ai-chat/services/intent-classifier.service';
import { TransactionDraftService } from '../../src/modules/ai-chat/services/transaction-draft.service';
import { CategoryClassifierService } from '../../src/modules/ai-chat/services/category-classifier.service';
import {
  QueryPlannerService,
  CannedQueryFunction,
} from '../../src/modules/ai-chat/services/query-planner.service';
import { CannedQueryRegistry } from '../../src/modules/ai-chat/services/canned-query.registry';
import { MascotToneService } from '../../src/modules/ai-chat/services/mascot-tone.service';
import { MascotAdviceService } from '../../src/modules/ai-chat/services/mascot-advice.service';
import { SpeechToTextService } from '../../src/modules/ai-chat/services/speech-to-text.service';
import { OcrService } from '../../src/modules/ai-chat/services/ocr.service';
import { ChatRateLimiter } from '../../src/modules/ai-chat/services/chat-rate-limiter.service';
import { ChatRole } from '../../src/modules/ai-chat/enums/chat-role.enum';
import { ChatMessageType } from '../../src/modules/ai-chat/enums/chat-message-type.enum';
import { PendingActionStatus } from '../../src/modules/ai-chat/enums/pending-action-status.enum';
import { AiIntent } from '../../src/modules/ai-chat/enums/ai-intent.enum';
import { PendingActionDecision } from '../../src/modules/ai-chat/dto/request/execute-pending-action.dto';
import {
  PendingActionNotFoundException,
  PendingActionExpiredException,
  PendingActionAlreadyProcessedException,
} from '../../src/modules/ai-chat/exceptions/ai-chat.exception';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import { TransactionSource } from '../../src/modules/transactions/enums/transaction-source.enum';
import { TimeRange } from '../../src/modules/ai-chat/utils/date.util';

describe('AiChatService', () => {
  let service: AiChatService;
  let chatMessageRepo: jest.Mocked<ChatMessageRepository>;
  let pendingActionRepo: jest.Mocked<PendingActionRepository>;
  let mapper: AiChatMapper;
  let walletsService: jest.Mocked<WalletsService>;
  let accountsService: jest.Mocked<AccountsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let mascotContext: jest.Mocked<MascotContextService>;
  let intentClassifier: jest.Mocked<IntentClassifierService>;
  let draftService: jest.Mocked<TransactionDraftService>;
  let categoryClassifier: jest.Mocked<CategoryClassifierService>;
  let queryPlanner: jest.Mocked<QueryPlannerService>;
  let cannedQueries: jest.Mocked<CannedQueryRegistry>;
  let tone: jest.Mocked<MascotToneService>;
  let adviceService: jest.Mocked<MascotAdviceService>;
  let stt: jest.Mocked<SpeechToTextService>;
  let ocr: jest.Mocked<OcrService>;
  let rateLimiter: jest.Mocked<ChatRateLimiter>;

  const USER_ID = 'u-test-123';
  const WALLET_ID = 'w-test-456';

  beforeEach(() => {
    chatMessageRepo = {
      createAndSave: jest.fn().mockImplementation((data) => ({
        id: 'msg-' + Math.random().toString(36).substring(7),
        ...data,
        createdAt: new Date(),
      })),
      findRecentContext: jest.fn().mockResolvedValue([]),
      findByWalletPaged: jest.fn().mockResolvedValue([
        {
          id: 'msg-1',
          walletId: WALLET_ID,
          userId: USER_ID,
          role: ChatRole.USER,
          messageType: ChatMessageType.TEXT,
          textContent: 'Hello',
          intent: null,
          mascot: null,
          payloadJson: null,
          createdAt: new Date(),
        },
      ]),
      deleteByWallet: jest.fn().mockResolvedValue(1),
    } as any;

    pendingActionRepo = {
      createAndSave: jest.fn().mockImplementation((data) => ({
        id: 'pa-test-789',
        ...data,
        status: PendingActionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findByIdAndUser: jest.fn(),
      findByChatMessageIds: jest.fn().mockResolvedValue([]),
      attachChatMessage: jest.fn().mockResolvedValue(undefined),
      withLock: jest.fn(),
      markStatus: jest.fn().mockResolvedValue(undefined),
      rejectPendingByWallet: jest.fn().mockResolvedValue(undefined),
      expireOldPendingActions: jest.fn().mockResolvedValue(0),
    } as any;

    mapper = new AiChatMapper();

    walletsService = {
      getWalletById: jest.fn().mockResolvedValue({ id: WALLET_ID, name: 'Ví Cá Nhân' }),
    } as any;

    accountsService = {
      listAccounts: jest.fn().mockResolvedValue({
        items: [
          { id: 'acc-1', name: 'Tiền mặt', balance: 500000, currency: 'VND' },
          { id: 'acc-2', name: 'Techcombank', balance: 2500000, currency: 'VND' },
        ],
        total: 2,
      }),
      validateAccountForTransaction: jest.fn().mockResolvedValue({ id: 'acc-1', name: 'Tiền mặt' }),
    } as any;

    categoriesService = {
      getCategories: jest.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Ăn uống', type: TransactionType.EXPENSE },
        { id: 'cat-2', name: 'Lương', type: TransactionType.INCOME },
      ]),
      validateCategoryForTransaction: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Ăn uống' }),
    } as any;

    transactionsService = {
      createTransaction: jest.fn().mockResolvedValue({
        id: 'tx-new-123',
        amount: 35000,
        name: 'Cà phê sáng',
      }),
    } as any;

    mascotContext = {
      resolve: jest.fn().mockResolvedValue('nora'),
      resolveWithPrompt: jest.fn().mockResolvedValue({ code: 'nora', systemPrompt: undefined }),
    } as any;

    intentClassifier = {
      classify: jest.fn().mockResolvedValue({
        intent: AiIntent.CHITCHAT,
        confidence: 1,
        source: 'rule',
      }),
      isAdviceRequest: jest.fn().mockReturnValue(false),
    } as any;

    draftService = {
      fromText: jest.fn().mockResolvedValue({
        ok: true,
        draft: {
          type: TransactionType.EXPENSE,
          amount: 35000,
          name: 'Cà phê sáng',
          date: '2026-10-23',
          note: null,
          accountId: 'acc-1',
          accountName: 'Tiền mặt',
          categoryId: 'cat-1',
          categoryName: 'Ăn uống',
          categoryKey: 'food',
          source: TransactionSource.CHAT_TEXT,
          currency: 'VND',
        },
      }),
      fromReceipt: jest.fn(),
    } as any;

    categoryClassifier = {
      keyOfCategory: jest.fn().mockReturnValue('food'),
    } as any;

    queryPlanner = {
      plan: jest.fn().mockResolvedValue({
        functionName: CannedQueryFunction.GET_SPENDING_SUMMARY,
        params: { timeRange: TimeRange.THIS_MONTH },
      }),
    } as any;

    cannedQueries = {
      isSupported: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue({
        messageType: ChatMessageType.CHART_PIE,
        textContent: 'Tổng quan chi tiêu',
        payloadJson: { chartType: 'pie', data: [] },
      }),
      unsupported: jest.fn().mockReturnValue({
        messageType: ChatMessageType.TEXT,
        textContent: 'Tính năng này Finora chưa hỗ trợ.',
        payloadJson: { supportedQueries: [] },
      }),
      summarizeRange: jest.fn().mockResolvedValue({
        totalExpense: 100000,
        totalIncome: 0,
      }),
    } as any;

    tone = {
      say: jest.fn().mockImplementation((_mascot, key) => `[Tone: ${key}]`),
      sayGenerated: jest.fn().mockResolvedValue('Finora luôn sẵn sàng đồng hành cùng bạn!'),
    } as any;

    adviceService = {
      needsMonthTotals: jest.fn().mockReturnValue(false),
      findAdvice: jest.fn().mockReturnValue(null),
    } as any;

    stt = {
      transcribe: jest.fn(),
    } as any;

    ocr = {
      extractText: jest.fn(),
    } as any;

    rateLimiter = {
      assertAllowed: jest.fn(),
    } as any;

    const dashboardService = {
      getExecutiveOverview: jest.fn().mockResolvedValue({
        netWorth: 5000000,
        monthlyCashflow: { expense: 2000000, income: 5000000 },
        accountsSummary: [{ balance: 5000000 }],
      }),
      getBudgetHealth: jest.fn().mockResolvedValue({
        totalBudgetLimit: 10000000,
        totalSpent: 2000000,
      }),
    } as any;

    const receiptRepo = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      createAndSave: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const cloudinaryService = {
      uploadMedia: jest.fn().mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/demo/receipt.jpg',
      }),
      deleteMedia: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    service = new AiChatService(
      chatMessageRepo,
      pendingActionRepo,
      mapper,
      walletsService,
      accountsService,
      categoriesService,
      transactionsService,
      receiptRepo,
      cloudinaryService,
      mascotContext,
      intentClassifier,
      draftService,
      categoryClassifier,
      queryPlanner,
      cannedQueries,
      tone,
      dashboardService,
      adviceService,
      stt,
      ocr,
      rateLimiter,
    );
  });

  describe('sendMessage', () => {
    it('khi người dùng muốn thêm giao dịch -> tạo PendingAction và CONFIRMATION_PROMPT', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.ADD_TRANSACTION,
        confidence: 1,
        source: 'rule',
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Tôi vừa uống cà phê hết 35k tiền mặt',
      });

      expect(res.role).toBe(ChatRole.ASSISTANT);
      expect(res.messageType).toBe(ChatMessageType.CONFIRMATION_PROMPT);
      expect(res.intent).toBe(AiIntent.ADD_TRANSACTION);
      expect(res.payloadJson?.pendingActionId).toBe('pa-test-789');
      expect(pendingActionRepo.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          walletId: WALLET_ID,
          toolName: 'draft_transaction',
        }),
      );
    });

    it('khi mascotContext resolve nora, mascot name và prompt fallback về nora', async () => {
      mascotContext.resolve.mockResolvedValue('nora');
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.CHITCHAT,
        confidence: 1,
        source: 'rule',
      });
      tone.sayGenerated.mockResolvedValue('Xin chào, tôi là Nora trợ lý tài chính.');

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Chào bạn',
      });

      expect(res.mascot).toBe('nora');
      expect(tone.sayGenerated).toHaveBeenCalledWith(
        'nora',
        'chitchat',
        'Chào bạn',
        undefined,
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('khi người dùng hỏi chi tiêu tháng này -> trả về CHART_PIE', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.QUERY_SPENDING,
        confidence: 1,
        source: 'rule',
      });
      queryPlanner.plan.mockResolvedValue({
        functionName: CannedQueryFunction.GET_SPENDING_SUMMARY,
        params: { timeRange: TimeRange.THIS_MONTH },
      });
      cannedQueries.isSupported.mockReturnValue(true);
      cannedQueries.execute.mockResolvedValue({
        messageType: ChatMessageType.CHART_PIE,
        textContent: 'Tổng chi tiêu tháng này',
        payloadJson: { chartType: 'pie', data: [] },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Tháng này tôi đã tiêu những gì?',
      });

      expect(res.messageType).toBe(ChatMessageType.CHART_PIE);
      expect(res.intent).toBe(AiIntent.QUERY_SPENDING);
      expect(res.payloadJson?.chartType).toBe('pie');
      expect(cannedQueries.execute).toHaveBeenCalled();
    });

    it('khi người dùng hỏi số dư ví -> trả về STAT_CARD', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.QUERY_SPENDING,
        confidence: 1,
        source: 'rule',
      });
      queryPlanner.plan.mockResolvedValue({
        functionName: CannedQueryFunction.GET_WALLET_BALANCES,
        params: { timeRange: TimeRange.THIS_MONTH },
      });
      cannedQueries.isSupported.mockReturnValue(true);
      cannedQueries.execute.mockResolvedValue({
        messageType: ChatMessageType.STAT_CARD,
        textContent: 'Số dư các tài khoản',
        payloadJson: { accounts: [], totalBalance: 3000000 },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Ví tôi hiện có bao nhiêu tiền?',
      });

      expect(res.messageType).toBe(ChatMessageType.STAT_CARD);
      expect(res.payloadJson?.totalBalance).toBe(3000000);
    });

    it('khi người dùng hỏi top danh mục chi nhiều nhất -> trả về CHART_BAR', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.QUERY_SPENDING,
        confidence: 1,
        source: 'rule',
      });
      queryPlanner.plan.mockResolvedValue({
        functionName: CannedQueryFunction.GET_TOP_CATEGORIES,
        params: { timeRange: TimeRange.THIS_MONTH, limit: 5 },
      });
      cannedQueries.isSupported.mockReturnValue(true);
      cannedQueries.execute.mockResolvedValue({
        messageType: ChatMessageType.CHART_BAR,
        textContent: 'Top danh mục chi tiêu',
        payloadJson: { chartType: 'bar', data: [] },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Cho tôi xem top 5 khoản tiêu tốn tiền nhất',
      });

      expect(res.messageType).toBe(ChatMessageType.CHART_BAR);
      expect(res.intent).toBe(AiIntent.QUERY_SPENDING);
      expect(res.payloadJson?.chartType).toBe('bar');
    });

    it('khi người dùng hỏi một chức năng truy vấn chưa hỗ trợ, hệ thống trả về thông báo chưa hỗ trợ', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.QUERY_SPENDING,
        confidence: 1,
        source: 'rule',
      });
      queryPlanner.plan.mockResolvedValue({
        functionName: 'get_crypto_prices' as any,
        params: { timeRange: TimeRange.THIS_MONTH },
      });
      cannedQueries.isSupported.mockReturnValue(false);
      cannedQueries.unsupported.mockReturnValue({
        messageType: ChatMessageType.TEXT,
        textContent: 'Tính năng tra cứu này chưa hỗ trợ',
        payloadJson: { supportedQueries: ['GET_SPENDING_SUMMARY'] },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Tra cứu giá Bitcoin hôm nay',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.textContent).toContain('chưa hỗ trợ');
      expect(res.payloadJson?.supportedQueries).toBeInstanceOf(Array);
    });

    it('khi người dùng trò chuyện chitchat, trả về tin nhắn TEXT bình thường', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.CHITCHAT,
        confidence: 1,
        source: 'rule',
      });
      intentClassifier.isAdviceRequest.mockReturnValue(false);
      tone.sayGenerated.mockResolvedValue('Finora luôn sẵn sàng đồng hành cùng bạn!');

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Hôm nay trời đẹp quá',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.intent).toBe(AiIntent.CHITCHAT);
      expect(res.textContent).toBe('Finora luôn sẵn sàng đồng hành cùng bạn!');
    });

    it('khi người dùng hỏi ngoài phạm vi (out_of_scope), trả về tin nhắn TEXT với intent OUT_OF_SCOPE', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.OUT_OF_SCOPE,
        confidence: 1,
        source: 'rule',
      });
      tone.sayGenerated.mockResolvedValue(
        'Tôi không thể giúp về vấn đề này. Hãy tập trung vào quản lý chi tiêu bạn nhé!',
      );

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Bitcoin có tăng giá không?',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.intent).toBe(AiIntent.OUT_OF_SCOPE);
      expect(res.textContent).toContain('quản lý chi tiêu');
    });

    it('khi người dùng nhắn mơ hồ (intent_unclear), trả về tin nhắn TEXT kèm clarifyOptions trong payloadJson', async () => {
      intentClassifier.classify.mockResolvedValue({
        intent: AiIntent.INTENT_UNCLEAR,
        confidence: 0,
        source: 'rule',
      });
      tone.sayGenerated.mockResolvedValue(
        'Tôi chưa hiểu rõ yêu cầu của bạn. Bạn muốn chọn tính năng nào dưới đây?',
      );

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: '?',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.intent).toBe(AiIntent.INTENT_UNCLEAR);
      expect(res.payloadJson?.clarifyOptions).toBeInstanceOf(Array);
      expect(res.payloadJson?.clarifyOptions.length).toBeGreaterThan(0);
    });
  });

  describe('executePendingAction', () => {
    const getMockPendingAction = () => ({
      id: 'pa-123',
      userId: USER_ID,
      walletId: WALLET_ID,
      toolName: 'draft_transaction',
      toolInput: {
        amount: 50000,
        type: TransactionType.EXPENSE,
        name: 'Trà sữa',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-10-23',
        source: TransactionSource.CHAT_TEXT,
      },
      previewPayload: {},
      status: PendingActionStatus.PENDING,
      expiresAt: new Date(Date.now() + 600000), // còn hạn 10 phút
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    it('khi CONFIRM -> tạo giao dịch thực qua TransactionsService và cập nhật status CONFIRMED', async () => {
      const action = getMockPendingAction();
      pendingActionRepo.withLock.mockImplementation(async (_id, _userId, work) => {
        return work(action, {} as any);
      });
      pendingActionRepo.markStatus.mockResolvedValue(undefined);

      const res = await service.executePendingAction(USER_ID, 'pa-123', {
        action: PendingActionDecision.CONFIRM,
      });

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          accountId: 'acc-1',
          categoryId: 'cat-1',
          amount: 50000,
          type: TransactionType.EXPENSE,
        }),
      );
      expect(pendingActionRepo.markStatus).toHaveBeenCalledWith(
        'pa-123',
        PendingActionStatus.CONFIRMED,
        'tx-new-123',
        expect.anything(),
      );
      expect(res.status).toBe(PendingActionStatus.CONFIRMED);
    });

    it('khi REJECT -> đánh dấu REJECTED và không gọi createTransaction', async () => {
      const action = getMockPendingAction();
      pendingActionRepo.withLock.mockImplementation(async (_id, _userId, work) => {
        return work(action, {} as any);
      });
      pendingActionRepo.markStatus.mockResolvedValue(undefined);

      const res = await service.executePendingAction(USER_ID, 'pa-123', {
        action: PendingActionDecision.REJECT,
      });

      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
      expect(pendingActionRepo.markStatus).toHaveBeenCalledWith(
        'pa-123',
        PendingActionStatus.REJECTED,
        null,
        expect.anything(),
      );
      expect(res.status).toBe(PendingActionStatus.REJECTED);
    });

    it('khi không tìm thấy pending action -> ném PendingActionNotFoundException', async () => {
      pendingActionRepo.withLock.mockResolvedValue(null);

      await expect(
        service.executePendingAction(USER_ID, 'pa-not-exist', {
          action: PendingActionDecision.CONFIRM,
        }),
      ).rejects.toThrow(PendingActionNotFoundException);
    });

    it('khi pending action đã hết hạn (quá 15p) -> ném PendingActionExpiredException', async () => {
      const expiredAction = {
        ...getMockPendingAction(),
        expiresAt: new Date(Date.now() - 10000), // Đã hết hạn
      };
      pendingActionRepo.withLock.mockImplementation(async (_id, _userId, work) => {
        return work(expiredAction, {} as any);
      });

      await expect(
        service.executePendingAction(USER_ID, 'pa-123', {
          action: PendingActionDecision.CONFIRM,
        }),
      ).rejects.toThrow(PendingActionExpiredException);
      expect(pendingActionRepo.markStatus).toHaveBeenCalledWith(
        'pa-123',
        PendingActionStatus.EXPIRED,
        null,
        expect.anything(),
      );
    });

    it('khi pending action đã CONFIRMED từ trước -> ném PendingActionAlreadyProcessedException', async () => {
      const alreadyConfirmed = {
        ...getMockPendingAction(),
        status: PendingActionStatus.CONFIRMED,
      };
      pendingActionRepo.withLock.mockImplementation(async (_id, _userId, work) => {
        return work(alreadyConfirmed, {} as any);
      });

      await expect(
        service.executePendingAction(USER_ID, 'pa-123', {
          action: PendingActionDecision.CONFIRM,
        }),
      ).rejects.toThrow(PendingActionAlreadyProcessedException);
    });
  });

  describe('getHistory & clearHistory', () => {
    it('getHistory gọi findByWalletPaged và trả về mảng tin nhắn ChatMessageResponseDto', async () => {
      const res = await service.getHistory(USER_ID, {
        walletId: WALLET_ID,
        limit: 10,
      });

      expect(res.length).toBe(1);
      expect(res[0].textContent).toBe('Hello');
    });

    it('clearHistory gọi deleteByWallet sau khi kiểm tra quyền ví', async () => {
      await service.clearHistory(USER_ID, WALLET_ID);
      expect(walletsService.getWalletById).toHaveBeenCalledWith(WALLET_ID, USER_ID);
      expect(chatMessageRepo.deleteByWallet).toHaveBeenCalledWith(WALLET_ID, USER_ID);
    });
  });
});
