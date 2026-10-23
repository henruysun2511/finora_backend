import { Injectable } from '@nestjs/common';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogItemDto } from '../dto/response/audit-log-response.dto';
import { AuditLogDetailResponseDto } from '../dto/response/audit-log-detail-response.dto';
import { EntityTimelineResponseDto } from '../dto/response/entity-timeline-response.dto';
import { AuditSummaryUtil } from '../utils/audit-summary.util';

@Injectable()
export class AuditLogMapper {
  toItemDto(log: AuditLog): AuditLogItemDto {
    return {
      id: log.id,
      userId: log.userId,
      userName: log.user?.fullName,
      userAvatar: log.user?.avatar,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: AuditSummaryUtil.generateSummary(
        log.action,
        log.entityType,
        log.oldValue,
        log.newValue,
      ),
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    };
  }

  toItemList(logs: AuditLog[]): AuditLogItemDto[] {
    return logs.map((log) => this.toItemDto(log));
  }

  toDetailDto(log: AuditLog): AuditLogDetailResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      userName: log.user?.fullName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      oldValue: log.oldValue,
      newValue: log.newValue,
      diff: AuditSummaryUtil.calculateDiff(log.oldValue, log.newValue),
      createdAt: log.createdAt,
    };
  }

  toEntityTimeline(
    entityType: string,
    entityId: string,
    logs: AuditLog[],
  ): EntityTimelineResponseDto {
    return {
      entityType,
      entityId,
      timeline: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorName: log.user?.fullName,
        description: AuditSummaryUtil.generateSummary(
          log.action,
          log.entityType,
          log.oldValue,
          log.newValue,
        ),
        createdAt: log.createdAt,
      })),
    };
  }
}
