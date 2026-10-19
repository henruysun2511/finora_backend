import { MessagesController } from '../../src/modules/messages/messages.controller';
import { MessagesService } from '../../src/modules/messages/messages.service';
import { SendMessageDto } from '../../src/modules/messages/dto/request/send-message.dto';
import { AddMessageReactionDto } from '../../src/modules/messages/dto/request/add-message-reaction.dto';
import { ReactionEmoji } from '../../src/common/enums/reaction-emoji.enum';

describe('MessagesController', () => {
  const messagesService = {
    getConversations: jest.fn(),
    getHistory: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    recallMessage: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
  };
  const controller = new MessagesController(
    messagesService as unknown as MessagesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates sending a message to MessagesService for the authenticated user', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const dto: SendMessageDto = {
      receiverId: '22222222-2222-2222-2222-222222222222',
      content: 'Hello',
    };
    const message = { id: '33333333-3333-3333-3333-333333333333' };
    messagesService.sendMessage.mockResolvedValue(message);

    const result = await controller.sendMessage(userId, dto);

    expect(messagesService.sendMessage).toHaveBeenCalledWith(userId, dto);
    expect(result.data).toEqual(message);
  });

  it('passes inbox search through to MessagesService', async () => {
    messagesService.getConversations.mockResolvedValue([]);

    await controller.getConversations('user-id', 'alice');

    expect(messagesService.getConversations).toHaveBeenCalledWith(
      'user-id',
      'alice',
    );
  });

  it('returns the number of messages marked as read without a seen event', async () => {
    messagesService.markAsRead.mockResolvedValue({ markedCount: 3 });

    const result = await controller.markAsRead('user-id', 'friend-id');

    expect(messagesService.markAsRead).toHaveBeenCalledWith(
      'user-id',
      'friend-id',
    );
    expect(result).toEqual({ success: true, markedCount: 3 });
  });

  it('returns the specified recall confirmation', async () => {
    messagesService.recallMessage.mockResolvedValue(undefined);

    const result = await controller.recallMessage('user-id', 'message-id');

    expect(messagesService.recallMessage).toHaveBeenCalledWith(
      'user-id',
      'message-id',
    );
    expect(result).toEqual({
      success: true,
      message: 'Đã thu hồi tin nhắn',
    });
  });

  it('returns the reaction result with HTTP handler response shape', async () => {
    const dto: AddMessageReactionDto = { emoji: ReactionEmoji.LOVE };
    messagesService.addReaction.mockResolvedValue({
      success: true,
      emoji: 'LOVE',
    });

    const result = await controller.addReaction('user-id', 'message-id', dto);

    expect(messagesService.addReaction).toHaveBeenCalledWith(
      'user-id',
      'message-id',
      dto,
    );
    expect(result).toEqual({ success: true, emoji: 'LOVE' });
  });
});
