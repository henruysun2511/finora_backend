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
import { NotificationResponseDto } from '../dto/response/notification-response.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Xác thực và gán client vào Room riêng theo userId khi kết nối thành công.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`[Socket] Kết nối bị từ chối: Thiếu JWT Token (Socket ID: ${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: JwtConfig.SECRET,
      });

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.warn(`[Socket] Token không hợp lệ: Không tìm thấy userId (Socket ID: ${client.id})`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      const roomName = `user:${userId}`;
      await client.join(roomName);

      this.logger.log(`[Socket] Client ${client.id} đã kết nối vào phòng ${roomName}`);
    } catch (err: any) {
      this.logger.warn(`[Socket] Xác thực JWT thất bại: ${err.message} (Socket ID: ${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Socket] Client đã ngắt kết nối: ${client.id} (User: ${client.data.userId || 'Chưa xác thực'})`);
  }

  /**
   * Phát thông báo mới đến tất cả thiết bị của một người dùng cụ thể.
   *
   * @param userId - UUID người nhận
   * @param notification - DTO thông báo
   * @param unreadCount - Số lượng thông báo chưa đọc mới nhất
   */
  sendNotificationToUser(
    userId: string,
    notification: NotificationResponseDto,
    unreadCount?: number,
  ) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('notification:received', notification);

    if (unreadCount !== undefined) {
      this.server.to(roomName).emit('notification:unread_count', { unreadCount });
    }
  }

  /**
   * Cập nhật số lượng thông báo chưa đọc tới thiết bị của người dùng.
   *
   * @param userId - UUID người dùng
   * @param unreadCount - Số lượng chưa đọc
   */
  sendUnreadCountToUser(userId: string, unreadCount: number) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('notification:unread_count', { unreadCount });
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
