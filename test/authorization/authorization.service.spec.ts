import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'modules/authorization/authorization.service';
import { RoleRepository } from 'modules/authorization/repository/role.repository';
import { PermissionRepository } from 'modules/authorization/repository/permission.repository';
import { RolePermissionRepository } from 'modules/authorization/repository/role-permission.repository';
import { AuthorizationMapper } from 'modules/authorization/mapper/authorization.mapper';
import { Role } from 'modules/authorization/entities/role.entity';
import { Permission } from 'modules/authorization/entities/permission.entity';
import {
  RoleNotFoundException,
  RoleCodeAlreadyExistsException,
  PermissionNotFoundException,
  PermissionCodeAlreadyExistsException,
} from 'modules/authorization/exceptions/authorization.exception';
import { CreateRoleDto } from 'modules/authorization/dto/request/create-role.dto';
import { UpdateRoleDto } from 'modules/authorization/dto/request/update-role.dto';
import { CreatePermissionDto } from 'modules/authorization/dto/request/create-permission.dto';
import { UpdatePermissionDto } from 'modules/authorization/dto/request/update-permission.dto';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let roleRepo: jest.Mocked<Partial<RoleRepository>>;
  let permissionRepo: jest.Mocked<Partial<PermissionRepository>>;
  let rolePermissionRepo: jest.Mocked<Partial<RolePermissionRepository>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockRoleId = '22222222-2222-2222-2222-222222222222';
  const mockPermId = '33333333-3333-3333-3333-333333333333';

  const mockRoleEntity: Role = {
    id: mockRoleId,
    code: 'ADMIN',
    name: 'Administrator',
    description: 'System Admin',
    isActive: true,
    deletedBy: null,
    rolePermissions: [],
    userRoles: [],
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
  } as unknown as Role;

  const mockPermEntity: Permission = {
    id: mockPermId,
    code: 'USERS_READ',
    name: 'Read Users',
    resource: 'users',
    action: 'read',
    description: 'Allow reading user list',
    rolePermissions: [],
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
  } as unknown as Permission;

  beforeEach(async () => {
    roleRepo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    permissionRepo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    rolePermissionRepo = {
      replacePermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: RoleRepository, useValue: roleRepo },
        { provide: PermissionRepository, useValue: permissionRepo },
        { provide: RolePermissionRepository, useValue: rolePermissionRepo },
        AuthorizationMapper,
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  // ── Roles Tests ───────────────────────────────────────────────────────────
  describe('createRole', () => {
    const dto: CreateRoleDto = {
      code: 'MANAGER',
      name: 'Manager',
      description: 'Department Manager',
    };

    it('should successfully create a role', async () => {
      roleRepo.findByCode!.mockResolvedValue(null);
      roleRepo.create!.mockResolvedValue({
        ...mockRoleEntity,
        code: 'MANAGER',
        name: 'Manager',
      } as Role);

      const result = await service.createRole(dto);

      expect(roleRepo.findByCode).toHaveBeenCalledWith('MANAGER');
      expect(roleRepo.create).toHaveBeenCalledWith(dto);
      expect(result.code).toBe('MANAGER');
    });

    it('should throw RoleCodeAlreadyExistsException if code exists', async () => {
      roleRepo.findByCode!.mockResolvedValue(mockRoleEntity);

      await expect(service.createRole(dto)).rejects.toThrow(
        RoleCodeAlreadyExistsException,
      );
    });
  });

  describe('findAllRoles', () => {
    it('should return list of role response DTOs', async () => {
      roleRepo.findAll!.mockResolvedValue([mockRoleEntity]);

      const result = await service.findAllRoles();

      expect(roleRepo.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockRoleId);
    });
  });

  describe('findRoleById', () => {
    it('should return role by ID', async () => {
      roleRepo.findById!.mockResolvedValue(mockRoleEntity);

      const result = await service.findRoleById(mockRoleId);

      expect(roleRepo.findById).toHaveBeenCalledWith(mockRoleId);
      expect(result.id).toBe(mockRoleId);
    });

    it('should throw RoleNotFoundException if role does not exist', async () => {
      roleRepo.findById!.mockResolvedValue(null);

      await expect(service.findRoleById('invalid-id')).rejects.toThrow(
        RoleNotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    const dto: UpdateRoleDto = { name: 'Super Admin' };

    it('should successfully update role', async () => {
      roleRepo.findById!.mockResolvedValue(mockRoleEntity);
      roleRepo.update!.mockResolvedValue({
        ...mockRoleEntity,
        name: 'Super Admin',
      } as Role);

      const result = await service.updateRole(mockRoleId, dto);

      expect(roleRepo.update).toHaveBeenCalledWith(mockRoleId, dto);
      expect(result.name).toBe('Super Admin');
    });

    it('should throw RoleNotFoundException when role does not exist', async () => {
      roleRepo.findById!.mockResolvedValue(null);

      await expect(service.updateRole('invalid-id', dto)).rejects.toThrow(
        RoleNotFoundException,
      );
    });

    it('should throw RoleCodeAlreadyExistsException when new code already exists', async () => {
      roleRepo.findById!.mockResolvedValue(mockRoleEntity);
      roleRepo.findByCode!.mockResolvedValue({
        ...mockRoleEntity,
        id: 'other-id',
      } as Role);

      await expect(
        service.updateRole(mockRoleId, { code: 'OTHER_CODE' }),
      ).rejects.toThrow(RoleCodeAlreadyExistsException);
    });
  });

  describe('softDeleteRole', () => {
    it('should soft delete role when it exists', async () => {
      roleRepo.findById!.mockResolvedValue(mockRoleEntity);
      roleRepo.softDelete!.mockResolvedValue(undefined);

      await service.softDeleteRole(mockRoleId, 'admin-uuid');

      expect(roleRepo.softDelete).toHaveBeenCalledWith(
        mockRoleId,
        'admin-uuid',
      );
    });

    it('should throw RoleNotFoundException if role does not exist', async () => {
      roleRepo.findById!.mockResolvedValue(null);

      await expect(service.softDeleteRole('invalid-id')).rejects.toThrow(
        RoleNotFoundException,
      );
    });
  });

  describe('assignPermissionsToRole', () => {
    it('should replace permissions and return updated role', async () => {
      roleRepo.findById!.mockResolvedValue(mockRoleEntity);
      rolePermissionRepo.replacePermissions!.mockResolvedValue(undefined);

      const result = await service.assignPermissionsToRole(mockRoleId, {
        permissionIds: [mockPermId],
      });

      expect(rolePermissionRepo.replacePermissions).toHaveBeenCalledWith(
        mockRoleId,
        [mockPermId],
      );
      expect(result.id).toBe(mockRoleId);
    });

    it('should throw RoleNotFoundException if role does not exist', async () => {
      roleRepo.findById!.mockResolvedValue(null);

      await expect(
        service.assignPermissionsToRole('invalid-id', {
          permissionIds: [mockPermId],
        }),
      ).rejects.toThrow(RoleNotFoundException);
    });
  });

  // ── Permissions Tests ─────────────────────────────────────────────────────
  describe('createPermission', () => {
    const dto: CreatePermissionDto = {
      code: 'USERS_DELETE',
      name: 'Delete User',
      resource: 'users',
      action: 'delete',
    };

    it('should create permission when code is unique', async () => {
      permissionRepo.findByCode!.mockResolvedValue(null);
      permissionRepo.create!.mockResolvedValue({
        ...mockPermEntity,
        code: 'USERS_DELETE',
      } as Permission);

      const result = await service.createPermission(dto);

      expect(permissionRepo.findByCode).toHaveBeenCalledWith('USERS_DELETE');
      expect(result.code).toBe('USERS_DELETE');
    });

    it('should throw PermissionCodeAlreadyExistsException if code exists', async () => {
      permissionRepo.findByCode!.mockResolvedValue(mockPermEntity);

      await expect(service.createPermission(dto)).rejects.toThrow(
        PermissionCodeAlreadyExistsException,
      );
    });
  });

  describe('findAllPermissions', () => {
    it('should return list of permissions', async () => {
      permissionRepo.findAll!.mockResolvedValue([mockPermEntity]);

      const result = await service.findAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPermId);
    });
  });

  describe('findPermissionById', () => {
    it('should return permission by id', async () => {
      permissionRepo.findById!.mockResolvedValue(mockPermEntity);

      const result = await service.findPermissionById(mockPermId);

      expect(result.id).toBe(mockPermId);
    });

    it('should throw PermissionNotFoundException if permission not found', async () => {
      permissionRepo.findById!.mockResolvedValue(null);

      await expect(service.findPermissionById('invalid-id')).rejects.toThrow(
        PermissionNotFoundException,
      );
    });
  });

  describe('updatePermission', () => {
    const dto: UpdatePermissionDto = { name: 'Updated Perm' };

    it('should update permission successfully', async () => {
      permissionRepo.findById!.mockResolvedValue(mockPermEntity);
      permissionRepo.update!.mockResolvedValue({
        ...mockPermEntity,
        name: 'Updated Perm',
      } as Permission);

      const result = await service.updatePermission(mockPermId, dto);

      expect(permissionRepo.update).toHaveBeenCalledWith(mockPermId, dto);
      expect(result.name).toBe('Updated Perm');
    });

    it('should throw PermissionNotFoundException if permission does not exist', async () => {
      permissionRepo.findById!.mockResolvedValue(null);

      await expect(service.updatePermission('invalid-id', dto)).rejects.toThrow(
        PermissionNotFoundException,
      );
    });
  });

  describe('removePermission', () => {
    it('should remove permission when it exists', async () => {
      permissionRepo.findById!.mockResolvedValue(mockPermEntity);
      permissionRepo.remove!.mockResolvedValue(undefined);

      await service.removePermission(mockPermId);

      expect(permissionRepo.remove).toHaveBeenCalledWith(mockPermId);
    });

    it('should throw PermissionNotFoundException if permission does not exist', async () => {
      permissionRepo.findById!.mockResolvedValue(null);

      await expect(service.removePermission('invalid-id')).rejects.toThrow(
        PermissionNotFoundException,
      );
    });
  });
});
