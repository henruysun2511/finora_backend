import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'modules/users/users.service';
import { UserRepository } from 'modules/users/repository/user.repository';
import { UserRoleRepository } from 'modules/users/repository/user-role.repository';
import { UserMapper } from 'modules/users/mapper/user.mapper';
import { UserStatus } from 'common/enums/user-status.enum';
import { AuthProvider } from 'common/enums/auth-provider.enum';
import {
  EmailAlreadyExistsException,
  UserNotFoundException,
} from 'modules/users/exceptions/user.exception';
import { User } from 'modules/users/entities/user.entity';
import { CreateUserDto } from 'modules/users/dto/request/create-user.dto';
import { UpdateUserDto } from 'modules/users/dto/request/update-user.dto';
import { UserQueryDto } from 'modules/users/dto/request/user-query.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Partial<UserRepository>>;
  let userRoleRepository: jest.Mocked<Partial<UserRoleRepository>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  const mockUserEntity: User = {
    id: mockUserId,
    email: 'test@finora.com',
    password: 'hashed_password',
    fullName: 'Test User',
    phone: '0987654321',
    avatar: null,
    googleId: null,
    authProvider: AuthProvider.LOCAL,
    status: UserStatus.ACTIVE,
    isActive: true,
    userRoles: [],
    tokens: [],
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
  } as unknown as User;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findWithPagination: jest.fn(),
      softDelete: jest.fn(),
    };

    userRoleRepository = {
      assignRole: jest.fn(),
      removeRole: jest.fn(),
      replaceRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepository },
        { provide: UserRoleRepository, useValue: userRoleRepository },
        UserMapper,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'test@finora.com',
      password: 'Password123!',
      fullName: 'Test User',
      phone: '0987654321',
    };

    it('should successfully create a new user', async () => {
      userRepository.findByEmail!.mockResolvedValue(null);
      userRepository.create!.mockResolvedValue(mockUserEntity);

      const result = await service.create(dto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(userRepository.create).toHaveBeenCalled();
      expect(result.id).toBe(mockUserId);
      expect(result.email).toBe(dto.email);
    });

    it('should throw EmailAlreadyExistsException if email is already taken', async () => {
      userRepository.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(service.create(dto)).rejects.toThrow(
        EmailAlreadyExistsException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated user response', async () => {
      const query = { page: 1, limit: 10 } as UserQueryDto;
      userRepository.findWithPagination!.mockResolvedValue([
        [mockUserEntity],
        1,
      ]);

      const result = await service.findAll(query);

      expect(userRepository.findWithPagination).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return user details by id', async () => {
      userRepository.findById!.mockResolvedValue(mockUserEntity);

      const result = await service.findOne(mockUserId);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(result.id).toBe(mockUserId);
    });

    it('should throw UserNotFoundException if user not found', async () => {
      userRepository.findById!.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      fullName: 'Updated Name',
      phone: '0123456789',
    };

    it('should successfully update user details', async () => {
      userRepository.findById!.mockResolvedValue(mockUserEntity);
      userRepository.update!.mockResolvedValue({
        ...mockUserEntity,
        fullName: 'Updated Name',
      } as User);

      const result = await service.update(mockUserId, updateDto);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ fullName: 'Updated Name' }),
      );
      expect(result.fullName).toBe('Updated Name');
    });

    it('should throw UserNotFoundException if user does not exist', async () => {
      userRepository.findById!.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should throw EmailAlreadyExistsException if updating to an existing email', async () => {
      userRepository.findById!.mockResolvedValue(mockUserEntity);
      userRepository.findByEmail!.mockResolvedValue({
        ...mockUserEntity,
        id: 'different-id',
      } as User);

      await expect(
        service.update(mockUserId, { email: 'another@finora.com' }),
      ).rejects.toThrow(EmailAlreadyExistsException);
    });
  });

  describe('remove', () => {
    it('should soft delete user when user exists', async () => {
      userRepository.findById!.mockResolvedValue(mockUserEntity);
      userRepository.softDelete!.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      await service.remove(mockUserId);

      expect(userRepository.softDelete).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw UserNotFoundException if user does not exist', async () => {
      userRepository.findById!.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('assignRoles', () => {
    it('should replace user roles and return updated user', async () => {
      const roleId = '22222222-2222-2222-2222-222222222222';
      userRepository.findById!.mockResolvedValue(mockUserEntity);
      userRoleRepository.replaceRoles!.mockResolvedValue(undefined);

      const result = await service.assignRoles(mockUserId, {
        roleIds: [roleId],
      });

      expect(userRoleRepository.replaceRoles).toHaveBeenCalledWith(mockUserId, [
        roleId,
      ]);
      expect(result.id).toBe(mockUserId);
    });

    it('should throw UserNotFoundException if user does not exist', async () => {
      userRepository.findById!.mockResolvedValue(null);

      await expect(
        service.assignRoles('invalid-id', { roleIds: [] }),
      ).rejects.toThrow(UserNotFoundException);
    });
  });
});
