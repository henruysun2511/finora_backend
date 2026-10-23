import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'modules/users/users.controller';
import { UsersService } from 'modules/users/users.service';
import { UserResponseDto } from 'modules/users/dto/response/user.dto';
import { UserQueryDto } from 'modules/users/dto/request/user-query.dto';
import { AssignRoleDto } from 'modules/users/dto/request/assign-role.dto';
import { UserStatus } from 'modules/users/enums/user-status.enum';
import { AuthProvider } from 'common/enums/auth-provider.enum';
import { ApiResponse, PaginatedResponse } from 'common/response/api-response';

import { UpdateProfileDto } from 'modules/users/dto/request/update-profile.dto';
import { UpdateUserDto } from 'modules/users/dto/request/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<Partial<UsersService>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  const mockUserResponse: UserResponseDto = {
    id: mockUserId,
    email: 'test@finora.com',
    fullName: 'Test User',
    phone: '0987654321',
    avatar: undefined,
    authProvider: AuthProvider.LOCAL,
    status: UserStatus.ACTIVE,
    isActive: true,
    roles: [],
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    service = {
      updateProfile: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile(mockUserResponse);

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return ApiResponse with status 200', async () => {
      const dto: UpdateProfileDto = {
        fullName: 'Updated Name',
        phone: '0123456789',
      };
      service.updateProfile!.mockResolvedValue({
        ...mockUserResponse,
        fullName: 'Updated Name',
        phone: '0123456789',
      });

      const result = await controller.updateProfile(mockUserId, dto);

      expect(service.updateProfile).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.fullName).toBe('Updated Name');
    });
  });

  describe('findAll', () => {
    it('should return paginated user list', async () => {
      const query = { page: 1, limit: 10 } as UserQueryDto;
      const paginated = PaginatedResponse.of([mockUserResponse], 1, 1, 10);
      service.findAll!.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return user detail by id', async () => {
      service.findOne!.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne(mockUserId);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('update', () => {
    it('should update user and return updated response', async () => {
      const dto: UpdateUserDto = { fullName: 'New Name' };
      const updatedResponse = { ...mockUserResponse, fullName: 'New Name' };
      service.update!.mockResolvedValue(updatedResponse);

      const result = await controller.update(mockUserId, dto);

      expect(service.update).toHaveBeenCalledWith(mockUserId, dto, undefined);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should remove user and return undefined', async () => {
      service.remove!.mockResolvedValue(undefined);

      const result = await controller.remove(mockUserId);

      expect(service.remove).toHaveBeenCalledWith(mockUserId, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('assignRoles', () => {
    it('should assign roles and return updated user', async () => {
      const dto: AssignRoleDto = {
        roleIds: ['22222222-2222-2222-2222-222222222222'],
      };
      service.assignRoles!.mockResolvedValue(mockUserResponse);

      const result = await controller.assignRoles(mockUserId, dto);

      expect(service.assignRoles).toHaveBeenCalledWith(mockUserId, dto, undefined);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockUserResponse);
    });
  });
});
