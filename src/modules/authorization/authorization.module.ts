import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RoleRepository } from './repository/role.repository';
import { PermissionRepository } from './repository/permission.repository';
import { RolePermissionRepository } from './repository/role-permission.repository';
import { AuthorizationMapper } from './mapper/authorization.mapper';
import { AuthorizationService } from './authorization.service';
import { AuthorizationController } from './authorization.controller';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  controllers: [AuthorizationController],
  providers: [
    AuthorizationService,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    AuthorizationMapper,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthorizationService,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthorizationModule {}
