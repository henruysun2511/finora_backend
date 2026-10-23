import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogMapper } from './mapper/audit-log.mapper';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    forwardRef(() => WalletsModule),
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogRepository, AuditLogMapper],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
