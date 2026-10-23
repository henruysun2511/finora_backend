import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { MessagesGateway } from '../../src/modules/messages/gateways/messages.gateway';
import { MessagesService } from '../../src/modules/messages/messages.service';
import { SendMessageDto } from '../../src/modules/messages/dto/request/send-message.dto';
import { Server } from 'socket.io';

describe('MessagesGateway', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const jwtService = {
    verify: jest.fn(),
  };
  const messagesService = {
    sendMessage: jest.fn(),
  };
  const gateway = new MessagesGateway(
    jwtService as unknown as JwtService,
    messagesService as unknown as MessagesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates a socket using the handshake token and joins its user room', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const client = {
      id: 'socket-id',
      data: {},
      handshake: { auth: { token: 'jwt-token' }, headers: {}, query: {} },
      join,
      disconnect: jest.fn(),
    } as unknown as Socket;
    jwtService.verify.mockReturnValue({ sub: userId });

    await gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith(
      'jwt-token',
      expect.any(Object),
    );
    expect(client.data.userId).toBe(userId);
    expect(join).toHaveBeenCalledWith(`user:${userId}`);
  });

  it('disconnects a socket without a handshake token', async () => {
    const disconnect = jest.fn();
    const client = {
      id: 'socket-id',
      data: {},
      handshake: { auth: {}, headers: {}, query: {} },
      join: jest.fn(),
      disconnect,
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalled();
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('sends socket messages through the service using the authenticated user id', async () => {
    const dto: SendMessageDto = {
      receiverId: '22222222-2222-2222-2222-222222222222',
      content: 'Hello',
    };
    const response = { id: 'message-id' };
    const client = {
      data: { userId },
    } as unknown as Socket;
    messagesService.sendMessage.mockResolvedValue(response);

    await expect(gateway.handleSendMessage(client, dto)).resolves.toBe(response);
    expect(messagesService.sendMessage).toHaveBeenCalledWith(userId, dto);
  });

  it('emits updated reactions to the recipient user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Server;
    const payload = { messageId: 'message-id', userId, emoji: 'LOVE' };

    gateway.sendReactionUpdatedToUser(
      '22222222-2222-2222-2222-222222222222',
      payload,
    );

    expect(to).toHaveBeenCalledWith(
      'user:22222222-2222-2222-2222-222222222222',
    );
    expect(emit).toHaveBeenCalledWith('message:reaction_updated', payload);
  });
});
