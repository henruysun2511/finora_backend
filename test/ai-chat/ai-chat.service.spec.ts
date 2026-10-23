import { AiChatService } from '../../src/modules/ai-chat-draft/ai-chat.service';
import { ChatMessageRepository } from '../../src/modules/ai-chat-draft/repositories/chat-message.repository';
import { PendingActionRepository } from '../../src/modules/ai-chat-draft/repositories/pending-action.repository';
import { LlmService } from '../../src/modules/ai-chat-draft/services/llm.service';
import { AiChatMapper } from '../../src/modules/ai-chat-draft/mapper/ai-chat.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { MascotsService } from '../../src/modules/mascots/mascots.service';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { ChatRole } from '../../src/modules/ai-chat-draft/enums/chat-role.enum';
import { ChatMessageType } from '../../src/modules/ai-chat-draft/enums/chat-message-type.enum';
import { PendingActionStatus } from '../../src/modules/ai-chat-draft/enums/pending-action-status.enum';
import { AiIntent } from '../../src/modules/ai-chat-draft/enums/ai-intent.enum';
import { PendingActionDecision } from '../../src/modules/ai-chat-draft/dto/request/execute-pending-action.dto';
import {
  PendingActionNotFoundException,
  PendingActionExpiredException,
  PendingActionAlreadyProcessedException,
} from '../../src/modules/ai-chat-draft/exceptions/ai-chat.exception';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import { AiProvider } from '../../src/modules/settings/enums/ai-provider.enum';
import { CannedQueryRegistry } from '../../src/modules/ai-chat-draft/services/canned-query.registry';

describe('AiChatService', () => {
  let service: AiChatService;
  let chatMessageRepo: jest.Mocked<ChatMessageRepository>;
  let pendingActionRepo: jest.Mocked<PendingActionRepository>;
  let llmService: jest.Mocked<LlmService>;
  let mapper: AiChatMapper;
  let walletsService: jest.Mocked<WalletsService>;
  let accountsService: jest.Mocked<AccountsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let mascotsService: jest.Mocked<MascotsService>;
  let settingsService: jest.Mocked<SettingsService>;

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
      markStatus: jest.fn(),
      expireOldPendingActions: jest.fn(),
    } as any;

    llmService = {
      generateReply: jest.fn(),
    } as any;

    mapper = new AiChatMapper();

    walletsService = {
      getWalletById: jest.fn().mockResolvedValue({ id: WALLET_ID, name: 'Ví Cá Nhân' }),
    } as any;

    accountsService = {
      listAccounts: jest.fn().mockResolvedValue({
        items: [
          { id: 'acc-1', name: 'Tiền mặt', balance: 500000 },
          { id: 'acc-2', name: 'Techcombank', balance: 2500000 },
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
      getDailyGrid: jest.fn().mockResolvedValue({
        month: 10,
        year: 2026,
        summary: {
          totalExpense: 80000,
          totalIncome: 0,
          totalTransactions: 2,
        },
        days: [
          {
            date: '2026-10-15',
            transactions: [
              { categoryId: 'cat-1', categoryName: 'Ăn uống', amount: 50000, type: TransactionType.EXPENSE },
              { categoryId: 'cat-1', categoryName: 'Ăn uống', amount: 30000, type: TransactionType.EXPENSE },
            ],
          },
        ],
      }),
    } as any;

    mascotsService = {
      getSystemPromptForUser: jest.fn().mockResolvedValue('Tone: Ruby energetic dragon'),
      getCurrentUserMascot: jest.fn().mockResolvedValue({
        mascot: { tierName: 'ruby' },
      }),
    } as any;

    settingsService = {
      getSettings: jest.fn().mockResolvedValue({ showMascot: true }),
      getEffectiveAiConfig: jest.fn().mockResolvedValue({
        provider: AiProvider.GEMINI,
        apiKey: 'test-key',
        model: 'gemini-1.5-flash',
      }),
    } as any;

    const cannedQueryRegistry = new CannedQueryRegistry(transactionsService, accountsService);

    service = new AiChatService(
      chatMessageRepo,
      pendingActionRepo,
      llmService,
      mapper,
      walletsService,
      accountsService,
      categoriesService,
      transactionsService,
      mascotsService,
      settingsService,
      cannedQueryRegistry,
    );
  });

  describe('sendMessage', () => {
    it('khi người dùng muốn thêm giao dịch, AI trả về tool draft_transaction -> tạo PendingAction và CONFIRMATION_PROMPT', async () => {
      llmService.generateReply.mockResolvedValue({
        text: 'Tôi đã chuẩn bị giao dịch Cà phê 35,000đ cho bạn. Bạn có xác nhận không?',
        intent: AiIntent.ADD_TRANSACTION,
        toolCall: {
          name: 'draft_transaction',
          args: {
            amount: 35000,
            type: 'EXPENSE',
            name: 'Cà phê sáng',
            categoryName: 'Ăn uống',
            accountName: 'Tiền mặt',
          },
        },
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

    it('khi showMascot = false, mascot name và prompt fallback về Nora trung lập', async () => {
      settingsService.getSettings.mockResolvedValue({ showMascot: false } as any);
      llmService.generateReply.mockResolvedValue({
        text: 'Xin chào, tôi là Nora trợ lý tài chính.',
        intent: AiIntent.CHITCHAT,
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Chào bạn',
      });

      expect(res.mascot).toBe('nora');
      expect(llmService.generateReply).toHaveBeenCalledWith(
        expect.objectContaining({
          mascotCode: 'nora',
        }),
      );
    });

    it('khi người dùng hỏi chi tiêu tháng này, AI gọi tool execute_canned_query (get_spending_summary) -> trả về CHART_PIE', async () => {
      llmService.generateReply.mockResolvedValue({
        text: '',
        intent: AiIntent.QUERY_SPENDING,
        toolCall: {
          name: 'execute_canned_query',
          args: {
            functionName: 'get_spending_summary',
            parameters: { timeRange: 'THIS_MONTH' },
          },
        },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Tháng này tôi đã tiêu những gì?',
      });

      expect(res.messageType).toBe(ChatMessageType.CHART_PIE);
      expect(res.intent).toBe(AiIntent.QUERY_SPENDING);
      expect(res.payloadJson).toBeDefined();
      expect(res.payloadJson?.chartType).toBe('pie');
      expect(res.payloadJson?.data).toBeInstanceOf(Array);
      expect(transactionsService.getDailyGrid).toHaveBeenCalled();
    });

    it('khi người dùng hỏi số dư ví, AI gọi tool execute_canned_query (get_wallet_balances) -> trả về STAT_CARD', async () => {
      llmService.generateReply.mockResolvedValue({
        text: '',
        intent: AiIntent.QUERY_SPENDING,
        toolCall: {
          name: 'execute_canned_query',
          args: {
            functionName: 'get_wallet_balances',
            parameters: {},
          },
        },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Ví tôi hiện có bao nhiêu tiền?',
      });

      expect(res.messageType).toBe(ChatMessageType.STAT_CARD);
      expect(res.payloadJson?.accounts).toBeInstanceOf(Array);
      expect(res.payloadJson?.totalBalance).toBe(3000000);
    });

    it('khi người dùng hỏi top danh mục chi nhiều nhất, AI gọi get_top_categories -> trả về CHART_BAR', async () => {
      llmService.generateReply.mockResolvedValue({
        text: '',
        intent: AiIntent.QUERY_SPENDING,
        toolCall: {
          name: 'execute_canned_query',
          args: {
            functionName: 'get_top_categories',
            parameters: { limit: 5 },
          },
        },
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Cho tôi xem top 5 khoản tiêu tốn tiền nhất',
      });

      expect(res.messageType).toBe(ChatMessageType.CHART_BAR);
      expect(res.intent).toBe(AiIntent.QUERY_SPENDING);
      expect(res.payloadJson?.chartType).toBe('bar');
      expect(res.payloadJson?.data).toBeInstanceOf(Array);
    });

    it('khi người dùng hỏi một chức năng truy vấn chưa hỗ trợ, hệ thống trả về thông báo chưa hỗ trợ', async () => {
      llmService.generateReply.mockResolvedValue({
        text: '',
        intent: AiIntent.QUERY_SPENDING,
        toolCall: {
          name: 'execute_canned_query',
          args: {
            functionName: 'get_crypto_prices',
            parameters: {},
          },
        },
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
      llmService.generateReply.mockResolvedValue({
        text: 'Finora luôn sẵn sàng đồng hành cùng bạn!',
        intent: AiIntent.CHITCHAT,
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Hôm nay trời đẹp quá',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.intent).toBe(AiIntent.CHITCHAT);
      expect(res.textContent).toBe('Finora luôn sẵn sàng đồng hành cùng bạn!');
    });

    it('khi người dùng hỏi ngoài phạm vi (out_of_scope), trả về tin nhắn TEXT với intent OUT_OF_SCOPE', async () => {
      llmService.generateReply.mockResolvedValue({
        text: 'Tôi không thể giúp về vấn đề này. Hãy tập trung vào quản lý chi tiêu bạn nhé!',
        intent: AiIntent.OUT_OF_SCOPE,
      });

      const res = await service.sendMessage(USER_ID, {
        walletId: WALLET_ID,
        message: 'Bitcoin có tăng giá không?',
      });

      expect(res.messageType).toBe(ChatMessageType.TEXT);
      expect(res.intent).toBe(AiIntent.OUT_OF_SCOPE);
      expect(res.textContent).toContain('quản lý chi tiêu');
    });

    it('khi người dùng nhắn mơ hồ (intent_unclear), trả về tin nhắn TEXT kèm clarifyOptions trong payloadJson', async () => {
      llmService.generateReply.mockResolvedValue({
        text: 'Tôi chưa hiểu rõ yêu cầu của bạn. Bạn muốn chọn tính năng nào dưới đây?',
        intent: AiIntent.INTENT_UNCLEAR,
      });

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
    const mockPendingAction = {
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
      },
      previewPayload: {},
      status: PendingActionStatus.PENDING,
      expiresAt: new Date(Date.now() + 600000), // còn hạn 10 phút
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    it('khi CONFIRM -> tạo giao dịch thực qua TransactionsService và cập nhật status CONFIRMED', async () => {
      pendingActionRepo.findByIdAndUser.mockResolvedValue(mockPendingAction);
      pendingActionRepo.markStatus.mockResolvedValue({
        ...mockPendingAction,
        status: PendingActionStatus.CONFIRMED,
        transactionId: 'tx-new-123',
      });

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
      );
      expect(res.status).toBe(PendingActionStatus.CONFIRMED);
    });

    it('khi REJECT -> đánh dấu REJECTED và không gọi createTransaction', async () => {
      pendingActionRepo.findByIdAndUser.mockResolvedValue(mockPendingAction);
      pendingActionRepo.markStatus.mockResolvedValue({
        ...mockPendingAction,
        status: PendingActionStatus.REJECTED,
      });

      const res = await service.executePendingAction(USER_ID, 'pa-123', {
        action: PendingActionDecision.REJECT,
      });

      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
      expect(pendingActionRepo.markStatus).toHaveBeenCalledWith(
        'pa-123',
        PendingActionStatus.REJECTED,
      );
      expect(res.status).toBe(PendingActionStatus.REJECTED);
    });

    it('khi không tìm thấy pending action -> ném PendingActionNotFoundException', async () => {
      pendingActionRepo.findByIdAndUser.mockResolvedValue(null);

      await expect(
        service.executePendingAction(USER_ID, 'pa-not-exist', {
          action: PendingActionDecision.CONFIRM,
        }),
      ).rejects.toThrow(PendingActionNotFoundException);
    });

    it('khi pending action đã hết hạn (quá 15p) -> ném PendingActionExpiredException', async () => {
      const expiredAction = {
        ...mockPendingAction,
        expiresAt: new Date(Date.now() - 10000), // Đã hết hạn
      };
      pendingActionRepo.findByIdAndUser.mockResolvedValue(expiredAction);

      await expect(
        service.executePendingAction(USER_ID, 'pa-123', {
          action: PendingActionDecision.CONFIRM,
        }),
      ).rejects.toThrow(PendingActionExpiredException);
      expect(pendingActionRepo.markStatus).toHaveBeenCalledWith(
        'pa-123',
        PendingActionStatus.EXPIRED,
      );
    });

    it('khi pending action đã CONFIRMED từ trước -> ném PendingActionAlreadyProcessedException', async () => {
      const alreadyConfirmed = {
        ...mockPendingAction,
        status: PendingActionStatus.CONFIRMED,
      };
      pendingActionRepo.findByIdAndUser.mockResolvedValue(alreadyConfirmed);

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
