import { Injectable } from '@nestjs/common';
import { Notification } from '../entities/notification.entity';
import { NotificationResponseDto } from '../dto/response/notification-response.dto';

@Injectable()
export class NotificationMapper {
  toResponse(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      isRead: entity.isRead,
      relatedEntityType: entity.relatedEntityType || null,
      relatedEntityId: entity.relatedEntityId || null,
      actionUrl: entity.actionUrl || this.resolveActionUrl(entity.relatedEntityType, entity.relatedEntityId),
      metadata: entity.metadata || null,
      readAt: entity.readAt || null,
      createdAt: entity.createdAt,
    };
  }

  private resolveActionUrl(entityType?: string, entityId?: string): string | null {
    if (!entityType || !entityId) return null;

    const normalized = entityType.toUpperCase();
    switch (normalized) {
      case 'BUDGET':
        return `/budgets/${entityId}`;
      case 'TRANSACTION':
        return `/transactions/${entityId}`;
      case 'RECURRING_TRANSACTION':
        return `/recurring/${entityId}`;
      case 'LOAN':
        return `/loans/${entityId}`;
      case 'EXPENSE_SPLIT':
      case 'SPLIT':
        return `/splits/${entityId}`;
      case 'GOAL':
      case 'SAVINGS_GOAL':
        return `/goals/${entityId}`;
      case 'FRIEND_REQUEST':
        return `/friends/requests`;
      case 'FRIEND':
      case 'FRIEND_ACCEPTED':
        return `/friends`;
      case 'DIRECT_MESSAGE':
        return `/messages/${entityId}`;
      case 'POST':
      case 'POST_REACTION':
        return `/feed/${entityId}`;
      case 'WALLET':
        return `/wallets/${entityId}`;
      default:
        return null;
    }
  }
}

