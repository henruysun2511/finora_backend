import { NotificationMapper } from '../../src/modules/notifications/mapper/notification.mapper';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';

describe('NotificationMapper', () => {
  let mapper: NotificationMapper;

  beforeEach(() => {
    mapper = new NotificationMapper();
  });

  it('toResponse sinh actionUrl chính xác theo loại đối tượng liên kết', () => {
    const entity = {
      id: 'notif-1',
      userId: 'user-1',
      type: NotificationType.BUDGET_WARNING,
      title: 'Ngân sách chạm ngưỡng',
      body: 'Bạn đã tiêu 80%',
      isRead: false,
      relatedEntityType: 'BUDGET',
      relatedEntityId: 'budget-123',
      createdAt: new Date(),
    } as any;

    const res = mapper.toResponse(entity);

    expect(res.id).toBe('notif-1');
    expect(res.actionUrl).toBe('/budgets/budget-123');
  });

  it('toResponse sinh actionUrl chính xác cho TRANSACTION, LOAN, SPLIT, FRIEND_REQUEST', () => {
    expect(mapper.toResponse({ relatedEntityType: 'TRANSACTION', relatedEntityId: 'tx-1' } as any).actionUrl).toBe(
      '/transactions/tx-1',
    );
    expect(mapper.toResponse({ relatedEntityType: 'LOAN', relatedEntityId: 'loan-1' } as any).actionUrl).toBe(
      '/loans/loan-1',
    );
    expect(mapper.toResponse({ relatedEntityType: 'EXPENSE_SPLIT', relatedEntityId: 'split-1' } as any).actionUrl).toBe(
      '/splits/split-1',
    );
    expect(mapper.toResponse({ relatedEntityType: 'FRIEND_REQUEST', relatedEntityId: 'fr-1' } as any).actionUrl).toBe(
      '/friends/requests',
    );
  });

  it('toResponse trả về actionUrl là null khi không có relatedEntityType hoặc relatedEntityId', () => {
    const res = mapper.toResponse({
      id: 'notif-2',
      userId: 'user-1',
      type: NotificationType.FRIEND_TRANSACTION_POSTED,
      title: 'Bài viết mới',
      body: 'Nội dung',
      isRead: false,
      relatedEntityType: null,
      relatedEntityId: null,
      createdAt: new Date(),
    } as any);

    expect(res.actionUrl).toBeNull();
  });
});
