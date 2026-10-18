import { NotificationsController } from '../../src/modules/notifications/notifications.controller';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PaginatedResponse } from '../../src/common/response/api-response';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;
  const USER_ID = 'u-123';

  beforeEach(() => {
    service = {
      getNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
    } as any;

    controller = new NotificationsController(service);
  });

  it('getNotifications gọi service và trả về danh sách phân trang', async () => {
    const query = { page: 1, limit: 10 };
    const mockList = PaginatedResponse.of(
      [
        {
          id: 'notif-1',
          userId: USER_ID,
          type: NotificationType.BUDGET_WARNING,
          title: 'Cảnh báo',
          body: 'Nội dung',
          isRead: false,
          createdAt: new Date(),
        } as any,
      ],
      1,
      1,
      10,
    );

    service.getNotifications.mockResolvedValue(mockList);

    const res = await controller.getNotifications(USER_ID, query);

    expect(service.getNotifications).toHaveBeenCalledWith(USER_ID, query);
    expect(res.items).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('getUnreadCount gọi service và trả về số lượng chưa đọc', async () => {
    service.getUnreadCount.mockResolvedValue({ unreadCount: 5 });

    const res = await controller.getUnreadCount(USER_ID);

    expect(service.getUnreadCount).toHaveBeenCalledWith(USER_ID);
    expect(res.data?.unreadCount).toBe(5);
  });

  it('markAsRead gọi service và trả về thông báo đã đọc', async () => {
    const mockNotif = {
      id: 'notif-1',
      isRead: true,
    } as any;

    service.markAsRead.mockResolvedValue(mockNotif);

    const res = await controller.markAsRead(USER_ID, 'notif-1');

    expect(service.markAsRead).toHaveBeenCalledWith(USER_ID, 'notif-1');
    expect(res.statusCode).toBe(200);
    expect(res.data?.isRead).toBe(true);
  });

  it('markAllAsRead gọi service và trả về 200 OK', async () => {
    service.markAllAsRead.mockResolvedValue({ affected: 3 });

    const res = await controller.markAllAsRead(USER_ID);

    expect(service.markAllAsRead).toHaveBeenCalledWith(USER_ID);
    expect(res.statusCode).toBe(200);
    expect(res.data?.affected).toBe(3);
  });

  it('deleteNotification gọi service và trả về 200 OK', async () => {
    service.deleteNotification.mockResolvedValue(undefined);

    const res = await controller.deleteNotification(USER_ID, 'notif-1');

    expect(service.deleteNotification).toHaveBeenCalledWith(USER_ID, 'notif-1');
    expect(res.statusCode).toBe(200);
    expect(res.message).toBe('Xóa thông báo thành công');
  });
});
