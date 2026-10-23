import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRepository } from './repositories/user.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserMapper } from './mapper/user.mapper';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole]),
    AuditLogsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, UserRoleRepository, UserMapper],
  exports: [UsersService],
})
export class UsersModule {}
