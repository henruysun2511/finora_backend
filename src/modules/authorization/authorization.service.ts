import { Injectable } from '@nestjs/common';
import { RoleRepository } from './repository/role.repository';
import { PermissionRepository } from './repository/permission.repository';
import { RolePermissionRepository } from './repository/role-permission.repository';
import { AuthorizationMapper } from './mapper/authorization.mapper';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { AssignPermissionDto } from './dto/request/assign-permission.dto';
import { CreatePermissionDto } from './dto/request/create-permission.dto';
import { UpdatePermissionDto } from './dto/request/update-permission.dto';
import { RoleResponseDto } from './dto/response/role.dto';
import { PermissionResponseDto } from './dto/response/permission.dto';
import {
  RoleNotFoundException,
  RoleCodeAlreadyExistsException,
  PermissionNotFoundException,
  PermissionCodeAlreadyExistsException,
} from './exceptions/authorization.exception';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly rolePermissionRepo: RolePermissionRepository,
    private readonly mapper: AuthorizationMapper,
  ) {}

  // ── Roles ─────────────────────────────────────────────────────────────────
  async createRole(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const existing = await this.roleRepo.findByCode(dto.code);
    if (existing) {
      throw new RoleCodeAlreadyExistsException(dto.code);
    }

    const role = await this.roleRepo.create(dto);
    return this.mapper.toRoleResponseDto(role);
  }

  async findAllRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepo.findAll();
    return this.mapper.toRoleResponseDtoList(roles);
  }

  async findRoleById(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new RoleNotFoundException(id);
    }
    return this.mapper.toRoleResponseDto(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new RoleNotFoundException(id);
    }

    if (dto.code && dto.code.toUpperCase() !== role.code) {
      const existing = await this.roleRepo.findByCode(dto.code);
      if (existing) {
        throw new RoleCodeAlreadyExistsException(dto.code);
      }
    }

    const updated = await this.roleRepo.update(id, dto);
    return this.mapper.toRoleResponseDto(updated);
  }

  async softDeleteRole(id: string, deletedBy?: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new RoleNotFoundException(id);
    }
    await this.roleRepo.softDelete(id, deletedBy);
  }

  async assignPermissionsToRole(
    roleId: string,
    dto: AssignPermissionDto,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    await this.rolePermissionRepo.replacePermissions(roleId, dto.permissionIds);
    const refreshed = await this.roleRepo.findById(roleId);
    return this.mapper.toRoleResponseDto(refreshed!);
  }

  // ── Permissions ───────────────────────────────────────────────────────────
  async createPermission(
    dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const existing = await this.permissionRepo.findByCode(dto.code);
    if (existing) {
      throw new PermissionCodeAlreadyExistsException(dto.code);
    }

    const permission = await this.permissionRepo.create(dto);
    return this.mapper.toPermissionResponseDto(permission);
  }

  async findAllPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepo.findAll();
    return this.mapper.toPermissionResponseDtoList(permissions);
  }

  async findPermissionById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw new PermissionNotFoundException(id);
    }
    return this.mapper.toPermissionResponseDto(permission);
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw new PermissionNotFoundException(id);
    }

    if (dto.code && dto.code.toUpperCase() !== permission.code) {
      const existing = await this.permissionRepo.findByCode(dto.code);
      if (existing) {
        throw new PermissionCodeAlreadyExistsException(dto.code);
      }
    }

    const updated = await this.permissionRepo.update(id, dto);
    return this.mapper.toPermissionResponseDto(updated);
  }

  async removePermission(id: string): Promise<void> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw new PermissionNotFoundException(id);
    }
    await this.permissionRepo.remove(id);
  }
}
