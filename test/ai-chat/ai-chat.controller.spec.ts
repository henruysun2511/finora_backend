import { AiChatController } from '../../src/modules/ai-chat-draft/ai-chat.controller';
import { AiChatService } from '../../src/modules/ai-chat-draft/ai-chat.service';
import { ChatRole } from '../../src/modules/ai-chat-draft/enums/chat-role.enum';
import { ChatMessageType } from '../../src/modules/ai-chat-draft/enums/chat-message-type.enum';
import { AiIntent } from '../../src/modules/ai-chat-draft/enums/ai-intent.enum';
import { PendingActionStatus } from '../../src/modules/ai-chat-draft/enums/pending-action-status.enum';
import { PendingActionDecision } from '../../src/modules/ai-chat-draft/dto/request/execute-pending-action.dto';

describe('AiChatController', () => {
  let controller: AiChatController;
  let service: jest.Mocked<AiChatService>;
  const USER_ID = 'u-123';
  const WALLET_ID = 'w-456';

  beforeEach(() => {
    service = {
      sendMessage: jest.fn(),
      getHistory: jest.fn(),
      executePendingAction: jest.fn(),
      clearHistory: jest.fn(),
    } as any;

    controller = new AiChatController(service);
  });

  it('sendMessage gọi service.sendMessage và trả về 200 OK với kết quả', async () => {
    const dto = {
      walletId: WALLET_ID,
      message: 'Hôm nay tôi tiêu gì?',
    };

    const mockResponse = {
      id: 'msg-1',
      role: ChatRole.ASSISTANT,
      messageType: ChatMessageType.TEXT,
      textContent: 'Bạn đã tiêu 50k ăn uống.',
      intent: AiIntent.QUERY_SPENDING,
      mascot: 'ruby',
      payloadJson: null,
      createdAt: new Date(),
    };

    service.sendMessage.mockResolvedValue(mockResponse);

    const res = await controller.sendMessage(USER_ID, dto);

    expect(service.sendMessage).toHaveBeenCalledWith(USER_ID, dto);
    expect(res.statusCode).toBe(201);
    expect(res.data?.id).toBe('msg-1');
    expect(res.data?.textContent).toBe('Bạn đã tiêu 50k ăn uống.');
  });

  it('getHistory gọi service.getHistory và trả về danh sách tin nhắn', async () => {
    const query = { walletId: WALLET_ID, limit: 10 };
    const mockList = [
      {
        id: 'msg-1',
        role: ChatRole.USER,
        messageType: ChatMessageType.TEXT,
        textContent: 'Hello',
        intent: null,
        mascot: null,
        payloadJson: null,
        createdAt: new Date(),
      },
    ];

    service.getHistory.mockResolvedValue(mockList);

    const res = await controller.getHistory(USER_ID, query);

    expect(service.getHistory).toHaveBeenCalledWith(USER_ID, query);
    expect(res.statusCode).toBe(200);
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].textContent).toBe('Hello');
  });

  it('executePendingAction gọi service.executePendingAction và trả về 200 OK', async () => {
    const dto = { action: PendingActionDecision.CONFIRM };
    const mockActionResponse = {
      id: 'pa-1',
      toolName: 'draft_transaction',
      toolInput: { amount: 50000 },
      previewPayload: {},
      status: PendingActionStatus.CONFIRMED,
      transactionId: 'tx-999',
      expiresAt: new Date(),
      createdAt: new Date(),
    };

    service.executePendingAction.mockResolvedValue(mockActionResponse);

    const res = await controller.executePendingAction(USER_ID, 'pa-1', dto);

    expect(service.executePendingAction).toHaveBeenCalledWith(USER_ID, 'pa-1', dto);
    expect(res.statusCode).toBe(200);
    expect(res.data?.status).toBe(PendingActionStatus.CONFIRMED);
    expect(res.data?.transactionId).toBe('tx-999');
  });

  it('clearHistory gọi service.clearHistory và trả về thông báo thành công', async () => {
    service.clearHistory.mockResolvedValue({
      success: true,
      message: 'Đã xóa toàn bộ lịch sử trò chuyện trong ví thành công',
    });

    const res = await controller.clearHistory(USER_ID, WALLET_ID);

    expect(service.clearHistory).toHaveBeenCalledWith(USER_ID, WALLET_ID);
    expect(res.statusCode).toBe(200);
    expect(res.data?.success).toBe(true);
  });
});
