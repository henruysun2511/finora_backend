import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationController } from 'modules/authorization/authorization.controller';
import { AuthorizationService } from 'modules/authorization/authorization.service';
import { RoleResponseDto } from 'modules/authorization/dto/response/role.dto';
import { PermissionResponseDto } from 'modules/authorization/dto/response/permission.dto';
import { CreateRoleDto } from 'modules/authorization/dto/request/create-role.dto';
import { UpdateRoleDto } from 'modules/authorization/dto/request/update-role.dto';
import { AssignPermissionDto } from 'modules/authorization/dto/request/assign-permission.dto';
import { CreatePermissionDto } from 'modules/authorization/dto/request/create-permission.dto';
import { UpdatePermissionDto } from 'modules/authorization/dto/request/update-permission.dto';

describe('AuthorizationController', () => {
  let controller: AuthorizationController;
  let service: jest.Mocked<Partial<AuthorizationService>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockRoleId = '22222222-2222-2222-2222-222222222222';
  const mockPermId = '33333333-3333-3333-3333-333333333333';

  const mockRoleResponse: RoleResponseDto = {
    id: mockRoleId,
    code: 'ADMIN',
    name: 'Admin',
    description: 'Admin role',
    isActive: true,
    isSysAdmin: true,
    permissions: [],

    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockPermResponse: PermissionResponseDto = {
    id: mockPermId,
    code: 'USERS_READ',
    name: 'Read Users',
    resource: 'users',
    action: 'read',
    description: 'Read permission',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    service = {
      createRole: jest.fn(),
      findAllRoles: jest.fn(),
      findRoleById: jest.fn(),
      updateRole: jest.fn(),
      softDeleteRole: jest.fn(),
      assignPermissionsToRole: jest.fn(),
      createPermission: jest.fn(),
      findAllPermissions: jest.fn(),
      findPermissionById: jest.fn(),
      updatePermission: jest.fn(),
      removePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationController],
      providers: [{ provide: AuthorizationService, useValue: service }],
    }).compile();

    controller = module.get<AuthorizationController>(AuthorizationController);
  });

  describe('createRole', () => {
    it('should create a role and return wrapped response with 201', async () => {
      const dto: CreateRoleDto = { code: 'ADMIN', name: 'Admin' };
      service.createRole!.mockResolvedValue(mockRoleResponse);

      const result = await controller.createRole(dto);

      expect(service.createRole).toHaveBeenCalledWith(dto);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual(mockRoleResponse);
    });
  });

  describe('findAllRoles', () => {
    it('should return all roles', async () => {
      service.findAllRoles!.mockResolvedValue([mockRoleResponse]);

      const result = await controller.findAllRoles();

      expect(service.findAllRoles).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual([mockRoleResponse]);
    });
  });

  describe('findRoleById', () => {
    it('should return role by ID', async () => {
      service.findRoleById!.mockResolvedValue(mockRoleResponse);

      const result = await controller.findRoleById(mockRoleId);

      expect(service.findRoleById).toHaveBeenCalledWith(mockRoleId);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockRoleResponse);
    });
  });

  describe('updateRole', () => {
    it('should update role and return updated role', async () => {
      const dto: UpdateRoleDto = { name: 'Super Admin' };
      service.updateRole!.mockResolvedValue({
        ...mockRoleResponse,
        name: 'Super Admin',
      });

      const result = await controller.updateRole(mockRoleId, dto);

      expect(service.updateRole).toHaveBeenCalledWith(mockRoleId, dto);
      expect(result.statusCode).toBe(200);
      expect(result.data.name).toBe('Super Admin');
    });
  });

  describe('removeRole', () => {
    it('should call softDeleteRole and return undefined', async () => {
      service.softDeleteRole!.mockResolvedValue(undefined);

      const result = await controller.removeRole(mockRoleId);

      expect(service.softDeleteRole).toHaveBeenCalledWith(mockRoleId);
      expect(result).toBeUndefined();
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to role and return updated role', async () => {
      const dto: AssignPermissionDto = { permissionIds: [mockPermId] };
      service.assignPermissionsToRole!.mockResolvedValue(mockRoleResponse);

      const result = await controller.assignPermissions(mockRoleId, dto);

      expect(service.assignPermissionsToRole).toHaveBeenCalledWith(
        mockRoleId,
        dto,
      );
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockRoleResponse);
    });
  });

  describe('createPermission', () => {
    it('should create permission and return 201', async () => {
      const dto: CreatePermissionDto = {
        code: 'USERS_READ',
        name: 'Read Users',
      };
      service.createPermission!.mockResolvedValue(mockPermResponse);

      const result = await controller.createPermission(dto);

      expect(service.createPermission).toHaveBeenCalledWith(dto);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual(mockPermResponse);
    });
  });

  describe('findAllPermissions', () => {
    it('should return all permissions', async () => {
      service.findAllPermissions!.mockResolvedValue([mockPermResponse]);

      const result = await controller.findAllPermissions();

      expect(service.findAllPermissions).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual([mockPermResponse]);
    });
  });

  describe('findPermissionById', () => {
    it('should return permission by id', async () => {
      service.findPermissionById!.mockResolvedValue(mockPermResponse);

      const result = await controller.findPermissionById(mockPermId);

      expect(service.findPermissionById).toHaveBeenCalledWith(mockPermId);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockPermResponse);
    });
  });

  describe('updatePermission', () => {
    it('should update permission and return updated response', async () => {
      const dto: UpdatePermissionDto = { name: 'Read All Users' };
      service.updatePermission!.mockResolvedValue({
        ...mockPermResponse,
        name: 'Read All Users',
      });

      const result = await controller.updatePermission(mockPermId, dto);

      expect(service.updatePermission).toHaveBeenCalledWith(mockPermId, dto);
      expect(result.statusCode).toBe(200);
      expect(result.data.name).toBe('Read All Users');
    });
  });

  describe('removePermission', () => {
    it('should remove permission and return undefined', async () => {
      service.removePermission!.mockResolvedValue(undefined);

      const result = await controller.removePermission(mockPermId);

      expect(service.removePermission).toHaveBeenCalledWith(mockPermId);
      expect(result).toBeUndefined();
    });
  });
});
