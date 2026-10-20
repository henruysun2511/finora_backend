import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationRepository } from '../../src/modules/notifications/repositories/notification.repository';
import { NotificationGateway } from '../../src/modules/notifications/gateways/notification.gateway';
import { NotificationMapper } from '../../src/modules/notifications/mapper/notification.mapper';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { NotificationNotFoundException } from '../../src/modules/notifications/exceptions/notification.exception';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: jest.Mocked<NotificationRepository>;
  let gateway: jest.Mocked<NotificationGateway>;
  let mapper: NotificationMapper;

  const USER_ID = 'u-123';

  beforeEach(() => {
    notifRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findPaged: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    gateway = {
      sendNotificationToUser: jest.fn(),
      sendUnreadCountToUser: jest.fn(),
    } as any;

    mapper = new NotificationMapper();

    service = new NotificationsService(notifRepo, gateway, mapper);
  });

  describe('createNotification', () => {
    it('Lưu notification vào DB và bắn realtime qua Socket Gateway', async () => {
      const dto = {
        userId: USER_ID,
        type: NotificationType.BUDGET_WARNING,
        title: 'Ngân sách sắp hết',
        body: 'Đã chi 80%',
        relatedEntityType: 'BUDGET',
        relatedEntityId: 'b-1',
      };

      const entity = {
        id: 'notif-1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      } as any;

      notifRepo.create.mockReturnValue(entity);
      notifRepo.save.mockResolvedValue(entity);
      notifRepo.countUnread.mockResolvedValue(3);

      const result = await service.createNotification(dto);

      expect(notifRepo.create).toHaveBeenCalled();
      expect(notifRepo.save).toHaveBeenCalled();
      expect(notifRepo.countUnread).toHaveBeenCalledWith(USER_ID);
      expect(gateway.sendNotificationToUser).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ id: 'notif-1', actionUrl: '/budgets/b-1' }),
        3,
      );
      expect(result!.id).toBe('notif-1');
      expect(result!.actionUrl).toBe('/budgets/b-1');
    });

    it('Bỏ qua thông báo khi người dùng tắt nhóm thông báo tương ứng trong settings', async () => {
      const mockSettingsService = {
        getNotificationPreferences: jest.fn().mockResolvedValue({
          budgetAlerts: false,
        }),
      } as any;

      const serviceWithSettings = new NotificationsService(
        notifRepo,
        gateway,
        mapper,
        mockSettingsService,
      );

      const dto = {
        userId: USER_ID,
        type: NotificationType.BUDGET_WARNING,
        title: 'Ngân sách sắp hết',
        body: 'Đã chi 80%',
      };

      const result = await serviceWithSettings.createNotification(dto);

      expect(result).toBeNull();
      expect(notifRepo.save).not.toHaveBeenCalled();
      expect(gateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('Thông báo bảo mật SECURITY_ALERT luôn được gửi kể cả khi pushNotifications = false', async () => {
      const mockSettingsService = {
        getNotificationPreferences: jest.fn().mockResolvedValue({
          pushNotifications: false,
        }),
      } as any;

      const serviceWithSettings = new NotificationsService(
        notifRepo,
        gateway,
        mapper,
        mockSettingsService,
      );

      const dto = {
        userId: USER_ID,
        type: NotificationType.SECURITY_ALERT,
        title: 'Cảnh báo bảo mật',
        body: 'Đăng nhập từ thiết bị lạ',
      };

      const entity = {
        id: 'notif-sec-1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      } as any;

      notifRepo.create.mockReturnValue(entity);
      notifRepo.save.mockResolvedValue(entity);
      notifRepo.countUnread.mockResolvedValue(1);

      const result = await serviceWithSettings.createNotification(dto);

      expect(result).not.toBeNull();
      expect(notifRepo.save).toHaveBeenCalled();
      expect(gateway.sendNotificationToUser).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('Lấy danh sách thông báo phân trang', async () => {
      const mockList = [
        {
          id: 'notif-1',
          userId: USER_ID,
          type: NotificationType.FRIEND_REQUEST,
          title: 'Lời mời kết bạn',
          body: 'An đã gửi lời mời',
          isRead: false,
          createdAt: new Date(),
        } as any,
      ];

      notifRepo.findPaged.mockResolvedValue([mockList, 1]);

      const res = await service.getNotifications(USER_ID, { page: 1, limit: 10 });

      expect(notifRepo.findPaged).toHaveBeenCalledWith(USER_ID, { page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.items[0].id).toBe('notif-1');
    });
  });

  describe('getUnreadCount', () => {
    it('Trả về số lượng thông báo chưa đọc', async () => {
      notifRepo.countUnread.mockResolvedValue(5);

      const res = await service.getUnreadCount(USER_ID);

      expect(notifRepo.countUnread).toHaveBeenCalledWith(USER_ID);
      expect(res.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('Đánh dấu đã đọc thành công và cập nhật unreadCount qua Socket', async () => {
      const mockNotif = {
        id: 'notif-1',
        userId: USER_ID,
        type: NotificationType.LOAN_DUE,
        title: 'Hạn trả nợ',
        body: 'Khoản vay đến hạn',
        isRead: true,
        createdAt: new Date(),
      } as any;

      notifRepo.markAsRead.mockResolvedValue(mockNotif);
      notifRepo.countUnread.mockResolvedValue(2);

      const res = await service.markAsRead(USER_ID, 'notif-1');

      expect(notifRepo.markAsRead).toHaveBeenCalledWith('notif-1', USER_ID);
      expect(gateway.sendUnreadCountToUser).toHaveBeenCalledWith(USER_ID, 2);
      expect(res.id).toBe('notif-1');
      expect(res.isRead).toBe(true);
    });

    it('Ném NotificationNotFoundException khi thông báo không tồn tại', async () => {
      notifRepo.markAsRead.mockResolvedValue(null);

      await expect(service.markAsRead(USER_ID, 'non-existent')).rejects.toThrow(
        NotificationNotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('Đánh dấu tất cả đã đọc và bắn unreadCount = 0 qua Socket', async () => {
      notifRepo.markAllAsRead.mockResolvedValue(4);

      const res = await service.markAllAsRead(USER_ID);

      expect(notifRepo.markAllAsRead).toHaveBeenCalledWith(USER_ID);
      expect(gateway.sendUnreadCountToUser).toHaveBeenCalledWith(USER_ID, 0);
      expect(res.affected).toBe(4);
    });
  });

  describe('deleteNotification', () => {
    it('Xóa mềm thông báo thành công và cập nhật unreadCount qua Socket', async () => {
      notifRepo.softDelete.mockResolvedValue(true);
      notifRepo.countUnread.mockResolvedValue(1);

      await service.deleteNotification(USER_ID, 'notif-1');

      expect(notifRepo.softDelete).toHaveBeenCalledWith('notif-1', USER_ID);
      expect(gateway.sendUnreadCountToUser).toHaveBeenCalledWith(USER_ID, 1);
    });

    it('Ném NotificationNotFoundException khi thông báo cần xóa không tồn tại', async () => {
      notifRepo.softDelete.mockResolvedValue(false);

      await expect(service.deleteNotification(USER_ID, 'non-existent')).rejects.toThrow(
        NotificationNotFoundException,
      );
    });
  });
});
