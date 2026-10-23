import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogMapper } from './mapper/audit-log.mapper';
import { WalletsService } from '../wallets/wallets.service';
import { CreateAuditLogDto } from './dto/request/create-audit-log.dto';
import { AuditLogQueryDto } from './dto/request/audit-log-query.dto';
import { ExportAuditLogDto } from './dto/request/export-audit-log.dto';
import { AuditLogItemDto } from './dto/response/audit-log-response.dto';
import { AuditLogDetailResponseDto } from './dto/response/audit-log-detail-response.dto';
import { EntityTimelineResponseDto } from './dto/response/entity-timeline-response.dto';
import {
  AuditLogNotFoundException,
  AuditLogAccessDeniedException,
  ExportDateRangeExceededException,
  InvalidExportFormatException,
} from './exceptions';
import { WalletAccessDeniedException } from '../wallets/exceptions/wallet.exception';
import { AUDIT_LOG_CONSTANTS } from './audit-logs.constant';
import { AuditExportUtil } from './utils/audit-export.util';
import { PaginatedResponse } from '../../common/response/api-response';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    private readonly auditLogRepo: AuditLogRepository,
    private readonly auditLogMapper: AuditLogMapper,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Ghi nhận audit log an toàn, bất đồng bộ ngầm.
   * Dùng cho TransactionsService, AccountsService, WalletsService, AuthService...
   * Không bao giờ block giao dịch chính và không rethrow lỗi ra ngoài.
   */
  async recordLog(dto: CreateAuditLogDto): Promise<void> {
    setImmediate(async () => {
      try {
        const log = this.auditLogRepo.create({
          userId: dto.userId,
          walletId: dto.walletId,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          oldValue: dto.oldValue
            ? JSON.parse(JSON.stringify(dto.oldValue))
            : undefined,
          newValue: dto.newValue
            ? JSON.parse(JSON.stringify(dto.newValue))
            : undefined,
        });

        await this.auditLogRepo.save(log);
      } catch (error) {
        this.logger.error(
          `[AuditLog] Ghi log thất bại cho Entity ${dto.entityType}:${dto.entityId}: ${error.message}`,
          error.stack,
        );
      }
    });
  }

  // ── LIST / TIMELINE ───────────────────────────────────────────────────────

  async findAll(
    userId: string,
    query: AuditLogQueryDto,
    isSysAdmin: boolean = false,
  ): Promise<PaginatedResponse<AuditLogItemDto>> {
    if (query.walletId && !isSysAdmin) {
      const role = await this.walletsService.getMemberRole(
        query.walletId,
        userId,
      );
      if (!role) {
        throw new WalletAccessDeniedException(query.walletId);
      }
    }

    const [logs, total] = await this.auditLogRepo.findPaginated(query, {
      userId,
      walletId: query.walletId,
      isAdmin: isSysAdmin,
    });

    const items = this.auditLogMapper.toItemList(logs);
    return PaginatedResponse.of(items, total, query.page, query.limit);
  }

  // ── DETAIL WITH DIFF ──────────────────────────────────────────────────────

  async findOne(
    id: string,
    userId: string,
    isSysAdmin: boolean = false,
  ): Promise<AuditLogDetailResponseDto> {
    const log = await this.auditLogRepo.findById(id);
    if (!log) {
      throw new AuditLogNotFoundException(id);
    }

    if (!isSysAdmin) {
      if (log.walletId) {
        const role = await this.walletsService.getMemberRole(
          log.walletId,
          userId,
        );
        if (!role) {
          throw new AuditLogAccessDeniedException({ id, walletId: log.walletId });
        }
      } else if (log.userId !== userId) {
        throw new AuditLogAccessDeniedException({ id, userId });
      }
    }

    return this.auditLogMapper.toDetailDto(log);
  }

  // ── ENTITY TIMELINE ───────────────────────────────────────────────────────

  async findByEntity(
    entityType: string,
    entityId: string,
    userId: string,
    isSysAdmin: boolean = false,
  ): Promise<EntityTimelineResponseDto> {
    const logs = await this.auditLogRepo.findByEntity(entityType, entityId);

    if (logs.length > 0 && !isSysAdmin) {
      const firstLog = logs[0];
      if (firstLog.walletId) {
        const role = await this.walletsService.getMemberRole(
          firstLog.walletId,
          userId,
        );
        if (!role) {
          throw new AuditLogAccessDeniedException({ entityType, entityId });
        }
      } else if (firstLog.userId && firstLog.userId !== userId) {
        throw new AuditLogAccessDeniedException({ entityType, entityId });
      }
    }

    return this.auditLogMapper.toEntityTimeline(entityType, entityId, logs);
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────

  async exportLogs(
    userId: string,
    query: ExportAuditLogDto,
    isSysAdmin: boolean = false,
  ): Promise<{ content: string; filename: string; contentType: string }> {
    if (query.format !== 'csv' && query.format !== 'xlsx') {
      throw new InvalidExportFormatException(query.format);
    }

    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new ExportDateRangeExceededException();
    }

    const diffDays =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > AUDIT_LOG_CONSTANTS.EXPORT.MAX_DAYS) {
      throw new ExportDateRangeExceededException(Math.round(diffDays));
    }

    if (query.walletId && !isSysAdmin) {
      const role = await this.walletsService.getMemberRole(
        query.walletId,
        userId,
      );
      if (!role) {
        throw new WalletAccessDeniedException(query.walletId);
      }
    }

    const logs = await this.auditLogRepo.findAllForExport(query, {
      userId,
      walletId: query.walletId,
      isAdmin: isSysAdmin,
    });

    const items = this.auditLogMapper.toItemList(logs);
    const csvContent = AuditExportUtil.toCsv(items);

    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[-:T]/g, '');
    const filename = `audit_logs_${timestamp}.${query.format === 'xlsx' ? 'csv' : 'csv'}`;

    return {
      content: csvContent,
      filename,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
