import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogQueryDto } from '../dto/request/audit-log-query.dto';
import { ExportAuditLogDto } from '../dto/request/export-audit-log.dto';

export interface AuditLogScopeOptions {
  userId?: string;
  walletId?: string;
  isAdmin?: boolean;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  create(data: Partial<AuditLog>): AuditLog {
    return this.repo.create(data);
  }

  async save(log: AuditLog): Promise<AuditLog> {
    return this.repo.save(log);
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.repo
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .where('audit_log.id = :id', { id })
      .andWhere('audit_log.deletedAt IS NULL')
      .getOne();
  }

  async findPaginated(
    query: AuditLogQueryDto,
    scope: AuditLogScopeOptions,
  ): Promise<[AuditLog[], number]> {
    const qb = this.repo
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .where('audit_log.deletedAt IS NULL');

    // ── DATA SCOPING ─────────────────────────────────────────────────────────
    if (scope.isAdmin) {
      if (query.walletId) {
        qb.andWhere('audit_log.walletId = :walletId', {
          walletId: query.walletId,
        });
      } else {
        qb.andWhere(
          'audit_log.walletId IS NULL AND audit_log.entityType IN (:...systemEntities)',
          { systemEntities: ['USER', 'AUTH'] },
        );
      }
    } else {
      if (query.walletId) {
        qb.andWhere('audit_log.walletId = :walletId', {
          walletId: query.walletId,
        });
      } else {
        qb.andWhere('audit_log.userId = :userId', { userId: scope.userId });
      }
    }

    // ── FILTERS ──────────────────────────────────────────────────────────────
    if (query.entityType) {
      qb.andWhere('audit_log.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.action) {
      qb.andWhere('audit_log.action = :action', { action: query.action });
    }

    if (query.startDate) {
      qb.andWhere('audit_log.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      qb.andWhere('audit_log.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    return qb
      .orderBy('audit_log.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
  }

  async findAllForExport(
    query: ExportAuditLogDto,
    scope: AuditLogScopeOptions,
  ): Promise<AuditLog[]> {
    const qb = this.repo
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .where('audit_log.deletedAt IS NULL');

    if (scope.isAdmin) {
      if (query.walletId) {
        qb.andWhere('audit_log.walletId = :walletId', {
          walletId: query.walletId,
        });
      } else {
        qb.andWhere(
          'audit_log.walletId IS NULL AND audit_log.entityType IN (:...systemEntities)',
          { systemEntities: ['USER', 'AUTH'] },
        );
      }
    } else {
      if (query.walletId) {
        qb.andWhere('audit_log.walletId = :walletId', {
          walletId: query.walletId,
        });
      } else {
        qb.andWhere('audit_log.userId = :userId', { userId: scope.userId });
      }
    }

    if (query.entityType) {
      qb.andWhere('audit_log.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.action) {
      qb.andWhere('audit_log.action = :action', { action: query.action });
    }

    qb.andWhere('audit_log.createdAt >= :startDate', {
      startDate: new Date(query.startDate),
    });
    qb.andWhere('audit_log.createdAt <= :endDate', {
      endDate: new Date(query.endDate),
    });

    return qb.orderBy('audit_log.createdAt', 'DESC').take(5000).getMany();
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.repo
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .where('audit_log.deletedAt IS NULL')
      .andWhere('audit_log.entityType = :entityType', { entityType })
      .andWhere('audit_log.entityId = :entityId', { entityId })
      .orderBy('audit_log.createdAt', 'DESC')
      .getMany();
  }
}
