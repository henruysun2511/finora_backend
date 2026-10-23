import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogMapper } from './mapper/audit-log.mapper';
import { WalletsModule } from '../wallets/wallets.module';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    forwardRef(() => WalletsModule),
  ],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogRepository,
    AuditLogMapper,
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditLogsService, AuditLogInterceptor],
})
export class AuditLogsModule {}
