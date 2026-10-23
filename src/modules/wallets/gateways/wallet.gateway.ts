import { Inject, Logger, forwardRef } from '@nestjs/common';
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
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from '../../../config/jwt.config';
import { WalletsService } from '../wallets.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/wallets',
})
export class WalletGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WalletGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Xác thực JWT khi kết nối và tự động cho client join vào các phòng ví đã ACCEPTED.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `[WalletSocket] Kết nối bị từ chối: Thiếu JWT Token (Socket ID: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: JwtConfig.SECRET,
      });

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.warn(
          `[WalletSocket] Token không hợp lệ: Không tìm thấy userId (Socket ID: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      await client.join(`user:${userId}`);

      try {
        const walletIds = await this.walletsService.getUserWalletIds(userId);
        for (const walletId of walletIds) {
          await client.join(`wallet_${walletId}`);
        }
        this.logger.log(
          `[WalletSocket] Client ${client.id} (User: ${userId}) đã kết nối và tham gia ${walletIds.length} phòng ví`,
        );
      } catch (err: any) {
        this.logger.warn(
          `[WalletSocket] Lỗi nạp danh sách ví cho user ${userId}: ${err.message}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `[WalletSocket] Xác thực JWT thất bại: ${err.message} (Socket ID: ${client.id})`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[WalletSocket] Client đã ngắt kết nối: ${client.id} (User: ${client.data.userId || 'Chưa xác thực'})`,
    );
  }

  /**
   * Cho phép client chủ động gửi yêu cầu join vào room ví cụ thể nếu được cấp quyền.
   */
  @SubscribeMessage('wallet:join')
  async handleJoinWallet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { walletId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.walletId) return;

    const role = await this.walletsService.getMemberRole(data.walletId, userId);
    if (role) {
      await client.join(`wallet_${data.walletId}`);
      client.emit('wallet:joined', { walletId: data.walletId, success: true });
    } else {
      client.emit('wallet:error', {
        message: 'Bạn không có quyền truy cập vào ví này',
      });
    }
  }

  /**
   * Cho phép client rời khỏi room ví cụ thể trên socket.
   */
  @SubscribeMessage('wallet:leave')
  async handleLeaveWallet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { walletId: string },
  ) {
    if (data?.walletId) {
      await client.leave(`wallet_${data.walletId}`);
      client.emit('wallet:left', { walletId: data.walletId, success: true });
    }
  }

  // ── SERVER BROADCAST METHODS ──────────────────────────────────────────────

  /**
   * Phát sự kiện biến động số dư tài khoản & tổng tài sản ví tới toàn bộ thành viên đang online.
   */
  broadcastBalanceUpdated(walletId: string, payload: any) {
    const roomName = `wallet_${walletId}`;
    this.server.to(roomName).emit('wallet:balance_updated', payload);
  }

  /**
   * Gửi sự kiện mời tham gia ví tới thiết bị của người được mời.
   */
  sendMemberInvited(userId: string, payload: any) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('wallet:member_invited', payload);
  }

  /**
   * Phát sự kiện thành viên mới chính thức gia nhập ví tới toàn bộ phòng ví.
   */
  broadcastMemberJoined(walletId: string, payload: any) {
    const roomName = `wallet_${walletId}`;
    this.server.to(roomName).emit('wallet:member_joined', payload);
  }

  /**
   * Phát sự kiện vai trò của thành viên trong ví được cập nhật.
   */
  broadcastMemberRoleUpdated(walletId: string, payload: any) {
    const roomName = `wallet_${walletId}`;
    this.server.to(roomName).emit('wallet:member_role_updated', payload);
  }

  /**
   * Phát sự kiện thành viên rời khỏi ví hoặc bị xóa (kick).
   */
  broadcastMemberRemoved(walletId: string, payload: any) {
    const roomName = `wallet_${walletId}`;
    this.server.to(roomName).emit('wallet:member_removed', payload);
  }

  /**
   * Phát sự kiện cảnh báo ngân sách ví tới toàn bộ thành viên.
   */
  broadcastBudgetAlert(walletId: string, payload: any) {
    const roomName = `wallet_${walletId}`;
    this.server.to(roomName).emit('wallet:budget_alert', payload);
  }

  // ── ROOM MANAGEMENT ───────────────────────────────────────────────────────

  /**
   * Thêm toàn bộ kết nối hiện tại của người dùng vào phòng ví (khi vừa chấp nhận lời mời).
   */
  async addSocketToWalletRoom(userId: string, walletId: string): Promise<void> {
    try {
      if (!this.server?.sockets?.sockets) return;
      const roomName = `wallet_${walletId}`;
      for (const [, socket] of this.server.sockets.sockets) {
        if (socket.data?.userId === userId) {
          await socket.join(roomName);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi khi gán socket vào phòng ví: ${err.message}`);
    }
  }

  /**
   * Đưa toàn bộ kết nối của người dùng ra khỏi phòng ví (khi rời ví hoặc bị kick).
   */
  async removeSocketFromWalletRoom(
    userId: string,
    walletId: string,
  ): Promise<void> {
    try {
      if (!this.server?.sockets?.sockets) return;
      const roomName = `wallet_${walletId}`;
      for (const [, socket] of this.server.sockets.sockets) {
        if (socket.data?.userId === userId) {
          await socket.leave(roomName);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi khi đưa socket ra khỏi phòng ví: ${err.message}`);
    }
  }

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
