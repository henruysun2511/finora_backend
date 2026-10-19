import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from '../../../config/jwt.config';
import { MessageResponseDto } from '../dto/response/message-response.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Xác thực JWT và gán client vào room cá nhân `user:${userId}`.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`[Messages Socket] Kết nối bị từ chối: Thiếu JWT Token (Socket ID: ${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: JwtConfig.SECRET,
      });

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.warn(`[Messages Socket] Token không hợp lệ (Socket ID: ${client.id})`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      const roomName = `user:${userId}`;
      await client.join(roomName);

      this.logger.log(`[Messages Socket] Client ${client.id} đã kết nối vào phòng ${roomName}`);
    } catch (err: any) {
      this.logger.warn(`[Messages Socket] Xác thực JWT thất bại: ${err.message} (Socket ID: ${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Messages Socket] Client đã ngắt kết nối: ${client.id} (User: ${client.data.userId || 'Chưa xác thực'})`);
  }

  /**
   * Phát tin nhắn mới đến room cá nhân của người nhận.
   */
  sendMessageToUser(userId: string, message: MessageResponseDto) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('message:received', message);
  }

  /**
   * Phát sự kiện thu hồi tin nhắn đến cả 2 bên.
   */
  sendRecalledToUser(userId: string, messageId: string) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('message:recalled', { messageId });
  }

  /**
   * Helper trích xuất JWT Token từ handshake auth, header hoặc query.
   */
  private extractToken(client: Socket): string | null {
    const authHeader =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;

    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    return authHeader.trim();
  }
}
