import { Injectable } from '@nestjs/common';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RoleResponseDto } from '../dto/response/role.dto';
import { PermissionResponseDto } from '../dto/response/permission.dto';

@Injectable()
export class AuthorizationMapper {
  toPermissionResponseDto(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  toPermissionResponseDtoList(
    permissions: Permission[],
  ): PermissionResponseDto[] {
    return permissions.map((p) => this.toPermissionResponseDto(p));
  }

  toRoleResponseDto(role: Role): RoleResponseDto {
    const permissions =
      role.rolePermissions
        ?.map((rp) => rp.permission)
        .filter((p) => p != null)
        .map((p) => this.toPermissionResponseDto(p)) ?? [];

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      isSysAdmin: role.isSysAdmin ?? false,
      permissions,

      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  toRoleResponseDtoList(roles: Role[]): RoleResponseDto[] {
    return roles.map((r) => this.toRoleResponseDto(r));
  }
}
