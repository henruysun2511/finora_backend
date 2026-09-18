import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'modules/auth/auth.service';
import { UserRepository } from 'modules/users/repository/user.repository';
import { UserRoleRepository } from 'modules/users/repository/user-role.repository';
import { RoleRepository } from 'modules/authorization/repository/role.repository';
import { TokenRepository } from 'modules/auth/repository/token.repository';
import { UserMapper } from 'modules/users/mapper/user.mapper';
import { User } from 'modules/users/entities/user.entity';
import { Role } from 'modules/authorization/entities/role.entity';
import { Token } from 'modules/auth/entities/token.entity';
import { AuthProvider } from 'common/enums/auth-provider.enum';
import { UserStatus } from 'common/enums/user-status.enum';
import { TokenType } from 'common/enums/token-type.enum';
import {
  InvalidCredentialsException,
  InvalidTokenException,
  AccountInactiveException,
} from 'modules/auth/exceptions/auth.exception';
import { EmailAlreadyExistsException } from 'modules/users/exceptions/user.exception';
import { RegisterDto } from 'modules/auth/dto/request/register.dto';
import { LoginDto } from 'modules/auth/dto/request/login.dto';
import { ChangePasswordDto } from 'modules/auth/dto/request/change-password.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Partial<UserRepository>>;
  let userRoleRepo: jest.Mocked<Partial<UserRoleRepository>>;
  let roleRepo: jest.Mocked<Partial<RoleRepository>>;
  let tokenRepo: jest.Mocked<Partial<TokenRepository>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('Password123!', 10);
  });

  const mockUserEntity: User = {
    id: mockUserId,
    email: 'user@finora.com',
    password: '', // will be set in beforeEach
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
    mockUserEntity.password = hashedPassword;

    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    userRoleRepo = {
      assignRole: jest.fn(),
    };

    roleRepo = {
      findByCode: jest.fn(),
    };

    tokenRepo = {
      saveToken: jest.fn(),
      findValidToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepo },
        { provide: UserRoleRepository, useValue: userRoleRepo },
        { provide: RoleRepository, useValue: roleRepo },
        { provide: TokenRepository, useValue: tokenRepo },
        { provide: JwtService, useValue: jwtService },
        UserMapper,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── Register ──────────────────────────────────────────────────────────────
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@finora.com',
      password: 'Password123!',
      fullName: 'New User',
    };

    it('should register a new user and return tokens', async () => {
      userRepo.findByEmail!.mockResolvedValue(null);
      userRepo.create!.mockResolvedValue(mockUserEntity);
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      roleRepo.findByCode!.mockResolvedValue({
        id: 'role-user-id',
        code: 'USER',
      } as Role);
      userRoleRepo.assignRole!.mockResolvedValue(undefined);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.register(registerDto);

      expect(userRepo.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userRepo.create).toHaveBeenCalled();
      expect(userRoleRepo.assignRole).toHaveBeenCalledWith(
        mockUserId,
        'role-user-id',
      );
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.refreshToken).toBe('mocked.jwt.token');
      expect(result.user.email).toBe(mockUserEntity.email);
    });

    it('should throw EmailAlreadyExistsException if email is already in use', async () => {
      userRepo.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(service.register(registerDto)).rejects.toThrow(
        EmailAlreadyExistsException,
      );
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'user@finora.com',
      password: 'Password123!',
    };

    it('should login with valid credentials', async () => {
      userRepo.findByEmail!.mockResolvedValue(mockUserEntity);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.refreshToken).toBe('mocked.jwt.token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw InvalidCredentialsException if user is not found', async () => {
      userRepo.findByEmail!.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException if password does not match', async () => {
      userRepo.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(
        service.login({ ...loginDto, password: 'WrongPassword!' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw AccountInactiveException if user is inactive', async () => {
      userRepo.findByEmail!.mockResolvedValue({
        ...mockUserEntity,
        isActive: false,
      } as User);

      await expect(service.login(loginDto)).rejects.toThrow(
        AccountInactiveException,
      );
    });
  });

  // ── Google OAuth2 Login ───────────────────────────────────────────────────
  describe('loginWithGoogle', () => {
    const profile = {
      googleId: 'google-123',
      email: 'google@finora.com',
      fullName: 'Google User',
      avatar: 'https://avatar.google.com/pic',
    };

    it('should login existing google user', async () => {
      userRepo.findByGoogleId!.mockResolvedValue(mockUserEntity);
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.loginWithGoogle(profile);

      expect(userRepo.findByGoogleId).toHaveBeenCalledWith(profile.googleId);
      expect(result.accessToken).toBe('mocked.jwt.token');
    });

    it('should create new user if googleId and email do not exist', async () => {
      userRepo.findByGoogleId!.mockResolvedValue(null);
      userRepo.findByEmail!.mockResolvedValue(null);
      userRepo.create!.mockResolvedValue(mockUserEntity);
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      roleRepo.findByCode!.mockResolvedValue(null);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.loginWithGoogle(profile);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: profile.googleId,
          authProvider: AuthProvider.GOOGLE,
        }),
      );
      expect(result.accessToken).toBe('mocked.jwt.token');
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────────
  describe('refreshToken', () => {
    it('should verify token, revoke old token, and issue new token pair', async () => {
      const refreshTokenStr = 'valid.refresh.token';
      jwtService.verify!.mockReturnValue({ sub: mockUserId });
      tokenRepo.findValidToken!.mockResolvedValue({
        id: 'tok-1',
        token: refreshTokenStr,
      } as Token);
      tokenRepo.revokeToken!.mockResolvedValue(undefined);
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.refreshToken(refreshTokenStr);

      expect(jwtService.verify).toHaveBeenCalled();
      expect(tokenRepo.revokeToken).toHaveBeenCalledWith(
        mockUserId,
        refreshTokenStr,
      );
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.refreshToken).toBe('mocked.jwt.token');
    });

    it('should throw InvalidTokenException if jwt verification fails', async () => {
      jwtService.verify!.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('expired.token')).rejects.toThrow(
        InvalidTokenException,
      );
    });

    it('should throw InvalidTokenException if token is not found or already revoked in db', async () => {
      jwtService.verify!.mockReturnValue({ sub: mockUserId });
      tokenRepo.findValidToken!.mockResolvedValue(null);

      await expect(service.refreshToken('revoked.token')).rejects.toThrow(
        InvalidTokenException,
      );
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should revoke specific refresh token if provided', async () => {
      tokenRepo.revokeToken!.mockResolvedValue(undefined);

      await service.logout(mockUserId, 'refresh.token');

      expect(tokenRepo.revokeToken).toHaveBeenCalledWith(
        mockUserId,
        'refresh.token',
      );
    });

    it('should revoke all tokens for user if no specific token provided', async () => {
      tokenRepo.revokeAllUserTokens!.mockResolvedValue(undefined);

      await service.logout(mockUserId);

      expect(tokenRepo.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUserId,
        TokenType.REFRESH_TOKEN,
      );
    });
  });

  // ── Change Password ───────────────────────────────────────────────────────
  describe('changePassword', () => {
    const dto: ChangePasswordDto = {
      currentPassword: 'Password123!',
      newPassword: 'NewPassword456!',
    };

    it('should change password and revoke existing tokens', async () => {
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      userRepo.findByEmail!.mockResolvedValue(mockUserEntity);
      userRepo.update!.mockResolvedValue(mockUserEntity);
      tokenRepo.revokeAllUserTokens!.mockResolvedValue(undefined);

      await service.changePassword(mockUserId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(tokenRepo.revokeAllUserTokens).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw InvalidCredentialsException if current password is wrong', async () => {
      userRepo.findById!.mockResolvedValue(mockUserEntity);
      userRepo.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(
        service.changePassword(mockUserId, {
          ...dto,
          currentPassword: 'WrongPassword!',
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
