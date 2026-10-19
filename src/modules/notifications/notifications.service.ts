import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationMapper } from './mapper/notification.mapper';
import { CreateNotificationDto } from './dto/request/create-notification.dto';
import { NotificationQueryDto } from './dto/request/notification-query.dto';
import { NotificationResponseDto } from './dto/response/notification-response.dto';
import { UnreadCountResponseDto } from './dto/response/unread-count-response.dto';
import { PaginatedResponse } from '../../common/response/api-response';
import { NotificationNotFoundException } from './exceptions/notification.exception';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifRepo: NotificationRepository,
    private readonly gateway: NotificationGateway,
    private readonly mapper: NotificationMapper,
  ) {}

  /**
   * Tạo thông báo mới: Lưu cơ sở dữ liệu và phát realtime qua Socket.IO tới User.
   *
   * @param dto - Dữ liệu thông báo
   * @returns NotificationResponseDto
   */
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const entity = this.notifRepo.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      isRead: false,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId,
    });

    const saved = await this.notifRepo.save(entity);
    const responseDto = this.mapper.toResponse(saved);

    // Tính số lượng chưa đọc mới nhất và push realtime qua WebSocket
    const unreadCount = await this.notifRepo.countUnread(dto.userId);
    this.gateway.sendNotificationToUser(dto.userId, responseDto, unreadCount);

    return responseDto;
  }

  /**
   * Lấy danh sách thông báo của người dùng có phân trang và bộ lọc.
   */
  async getNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    const [notifications, total] = await this.notifRepo.findPaged(userId, query);
    const items = notifications.map((n) => this.mapper.toResponse(n));

    return PaginatedResponse.of(items, total, query.page, query.limit);
  }

  /**
   * Lấy số lượng thông báo chưa đọc hiện tại của người dùng.
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.notifRepo.countUnread(userId);
    return { unreadCount: count };
  }

  /**
   * Đánh dấu một thông báo là đã đọc.
   */
  async markAsRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const updated = await this.notifRepo.markAsRead(id, userId);
    if (!updated) {
      throw new NotificationNotFoundException(id);
    }

    // Cập nhật lại số lượng chưa đọc qua Socket
    const unreadCount = await this.notifRepo.countUnread(userId);
    this.gateway.sendUnreadCountToUser(userId, unreadCount);

    return this.mapper.toResponse(updated);
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc.
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const affected = await this.notifRepo.markAllAsRead(userId);

    // Phát sự kiện unreadCount = 0 qua Socket
    this.gateway.sendUnreadCountToUser(userId, 0);

    return { affected };
  }

  /**
   * Xóa thông báo (Soft Delete).
   */
  async deleteNotification(userId: string, id: string): Promise<void> {
    const deleted = await this.notifRepo.softDelete(id, userId);
    if (!deleted) {
      throw new NotificationNotFoundException(id);
    }

    // Cập nhật lại số unread qua Socket
    const unreadCount = await this.notifRepo.countUnread(userId);
    this.gateway.sendUnreadCountToUser(userId, unreadCount);
  }

  /**
   * [CROSS-MODULE] Lấy thời gian gửi nhắc nợ (LOAN_DUE) gần nhất cho một khoản vay cụ thể.
   * Dùng cho LoansService để kiểm tra giới hạn tần suất 6 tiếng/lần.
   */
  async findLatestLoanReminder(
    loanId: string,
    recipientUserId: string,
  ): Promise<Date | null> {
    const notif = await this.notifRepo.findLatestByEntity(
      recipientUserId,
      NotificationType.LOAN_DUE,
      'LOAN',
      loanId,
    );
    return notif ? notif.createdAt : null;
  }
}
