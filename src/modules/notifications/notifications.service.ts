import { Injectable, Logger, Optional } from '@nestjs/common';
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
import { SettingsRepository } from '../settings/repositories/settings.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notifRepo: NotificationRepository,
    private readonly gateway: NotificationGateway,
    private readonly mapper: NotificationMapper,
    @Optional() private readonly settingsRepo?: SettingsRepository,
  ) {}

  /**
   * Tạo thông báo mới: Lọc qua notificationPreferences, lưu cơ sở dữ liệu và phát realtime qua Socket.IO tới User.
   *
   * @param dto - Dữ liệu thông báo
   * @returns NotificationResponseDto | null nếu bị chặn bởi cài đặt của người dùng
   */
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto | null> {
    const isAllowed = await this.isNotificationAllowed(dto.userId, dto.type);
    if (!isAllowed) {
      this.logger.debug(
        `Notification type ${dto.type} skipped for user ${dto.userId} due to notificationPreferences`,
      );
      return null;
    }

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
   * Kiểm tra xem loại thông báo này có được người dùng cho phép nhận không
   * dựa trên notificationPreferences trong bảng Settings.
   */
  private async isNotificationAllowed(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    if (!this.settingsRepo) {
      return true;
    }

    // Các thông báo bảo mật và hệ thống khẩn cấp luôn luôn được gửi
    if (
      type === NotificationType.SECURITY_ALERT ||
      type === NotificationType.SYSTEM_ANNOUNCEMENT
    ) {
      return true;
    }

    const setting = await this.settingsRepo.findByUserId(userId);
    if (!setting || !setting.notificationPreferences) {
      return true;
    }

    const prefs = setting.notificationPreferences as Record<string, unknown>;

    // Master switch: Tắt toàn bộ thông báo đẩy
    if (prefs.pushNotifications === false) {
      return false;
    }

    // Nhóm Ngân sách
    if (
      (type === NotificationType.BUDGET_WARNING ||
        type === NotificationType.BUDGET_EXCEEDED) &&
      prefs.budgetAlerts === false
    ) {
      return false;
    }

    // Nhóm Vay nợ
    if (
      (type === NotificationType.LOAN_DUE ||
        type === NotificationType.LOAN_PAYMENT_RECEIVED) &&
      prefs.loanReminders === false
    ) {
      return false;
    }

    // Nhóm Giao dịch định kỳ
    if (
      type === NotificationType.RECURRING_EXECUTED &&
      prefs.recurringReminders === false
    ) {
      return false;
    }

    // Nhóm Linh vật & Cấp bậc tài sản
    if (
      (type === NotificationType.ASSET_TIER_UP ||
        type === NotificationType.ASSET_TIER_DOWN) &&
      prefs.mascotEvolutionAlerts === false
    ) {
      return false;
    }

    // Nhóm Bạn bè, Bảng tin & Chia tiền
    if (
      (type === NotificationType.FRIEND_REQUEST ||
        type === NotificationType.FRIEND_ACCEPTED ||
        type === NotificationType.FRIEND_TRANSACTION_POSTED ||
        type === NotificationType.POST_REACTED ||
        type === NotificationType.SPLIT_REQUEST ||
        type === NotificationType.SPLIT_PROPOSAL ||
        type === NotificationType.SPLIT_ACCEPTED ||
        type === NotificationType.SPLIT_CONFIRMED) &&
      prefs.friendActivityAlerts === false
    ) {
      return false;
    }

    // Nhóm Tin nhắn trực tiếp
    if (
      (type === NotificationType.NEW_DIRECT_MESSAGE ||
        type === NotificationType.MESSAGE_REACTED) &&
      prefs.directMessages === false
    ) {
      return false;
    }

    return true;
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
