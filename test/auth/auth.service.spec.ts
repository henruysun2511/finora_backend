import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'modules/auth/auth.service';
import { UsersService } from 'modules/users/users.service';
import { AuthorizationService } from 'modules/authorization/authorization.service';
import { TokenRepository } from 'modules/auth/repository/token.repository';
import { User } from 'modules/users/entities/user.entity';
import { RoleResponseDto } from 'modules/authorization/dto/response/role.dto';
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
  let usersService: jest.Mocked<Partial<UsersService>>;
  let authorizationService: jest.Mocked<Partial<AuthorizationService>>;
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

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      createAuthUser: jest.fn(),
      updateAuthUser: jest.fn(),
      assignRole: jest.fn(),
      toResponseDto: jest.fn().mockImplementation((u: User) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        avatar: u.avatar ?? undefined,
        authProvider: u.authProvider,
        status: u.status,
        isActive: u.isActive,
        roles: [],
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    };

    authorizationService = {
      findRoleByCode: jest.fn(),
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
        { provide: UsersService, useValue: usersService },
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: TokenRepository, useValue: tokenRepo },
        { provide: JwtService, useValue: jwtService },
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
      usersService.findByEmail!.mockResolvedValue(null);
      usersService.createAuthUser!.mockResolvedValue(mockUserEntity);
      usersService.findById!.mockResolvedValue(mockUserEntity);
      authorizationService.findRoleByCode!.mockResolvedValue({
        id: 'role-user-id',
        code: 'USER',
        name: 'User',
      } as RoleResponseDto);
      usersService.assignRole!.mockResolvedValue(undefined);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.createAuthUser).toHaveBeenCalled();
      expect(usersService.assignRole).toHaveBeenCalledWith(
        mockUserId,
        'role-user-id',
      );
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.refreshToken).toBe('mocked.jwt.token');
      expect(result.user.email).toBe(mockUserEntity.email);
    });

    it('should throw EmailAlreadyExistsException if email is already in use', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUserEntity);

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
      usersService.findByEmail!.mockResolvedValue(mockUserEntity);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.refreshToken).toBe('mocked.jwt.token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw InvalidCredentialsException if user is not found', async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException if password does not match', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(
        service.login({ ...loginDto, password: 'WrongPassword!' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw AccountInactiveException if user is inactive', async () => {
      usersService.findByEmail!.mockResolvedValue({
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
      usersService.findByGoogleId!.mockResolvedValue(mockUserEntity);
      usersService.findById!.mockResolvedValue(mockUserEntity);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.loginWithGoogle(profile);

      expect(usersService.findByGoogleId).toHaveBeenCalledWith(
        profile.googleId,
      );
      expect(result.accessToken).toBe('mocked.jwt.token');
    });

    it('should create new user if googleId and email do not exist', async () => {
      usersService.findByGoogleId!.mockResolvedValue(null);
      usersService.findByEmail!.mockResolvedValue(null);
      usersService.createAuthUser!.mockResolvedValue(mockUserEntity);
      usersService.findById!.mockResolvedValue(mockUserEntity);
      authorizationService.findRoleByCode!.mockResolvedValue(null);
      tokenRepo.saveToken!.mockResolvedValue({} as Token);

      const result = await service.loginWithGoogle(profile);

      expect(usersService.createAuthUser).toHaveBeenCalledWith(
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
      usersService.findById!.mockResolvedValue(mockUserEntity);
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
      usersService.findById!.mockResolvedValue(mockUserEntity);
      usersService.findByEmail!.mockResolvedValue(mockUserEntity);
      usersService.updateAuthUser!.mockResolvedValue(mockUserEntity);
      tokenRepo.revokeAllUserTokens!.mockResolvedValue(undefined);

      await service.changePassword(mockUserId, dto);

      expect(usersService.updateAuthUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(tokenRepo.revokeAllUserTokens).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw InvalidCredentialsException if current password is wrong', async () => {
      usersService.findById!.mockResolvedValue(mockUserEntity);
      usersService.findByEmail!.mockResolvedValue(mockUserEntity);

      await expect(
        service.changePassword(mockUserId, {
          ...dto,
          currentPassword: 'WrongPassword!',
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
