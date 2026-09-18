import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'modules/auth/auth.controller';
import { AuthService } from 'modules/auth/auth.service';
import { RegisterDto } from 'modules/auth/dto/request/register.dto';
import { LoginDto } from 'modules/auth/dto/request/login.dto';
import { RefreshTokenDto } from 'modules/auth/dto/request/refresh-token.dto';
import { ChangePasswordDto } from 'modules/auth/dto/request/change-password.dto';
import { AuthResponseDto } from 'modules/auth/dto/response/auth-response.dto';
import { AuthTokensDto } from 'modules/auth/dto/response/auth-tokens.dto';
import { UserResponseDto } from 'modules/users/dto/response/user.dto';
import { AuthProvider } from 'common/enums/auth-provider.enum';
import { UserStatus } from 'common/enums/user-status.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<Partial<AuthService>>;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  const mockUserResponse: UserResponseDto = {
    id: mockUserId,
    email: 'user@finora.com',
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

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access.token.jwt',
    refreshToken: 'refresh.token.jwt',
    expiresIn: '15m',
    user: mockUserResponse,
  };

  const mockTokensResponse: AuthTokensDto = {
    accessToken: 'new.access.token',
    refreshToken: 'new.refresh.token',
    expiresIn: '15m',
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should register user and return 201 ApiResponse', async () => {
      const dto: RegisterDto = {
        email: 'user@finora.com',
        password: 'Password123!',
        fullName: 'Test User',
      };
      service.register!.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should authenticate user and return 200 ApiResponse', async () => {
      const dto: LoginDto = {
        email: 'user@finora.com',
        password: 'Password123!',
      };
      service.login!.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(dto, 'agent', '127.0.0.1');

      expect(service.login).toHaveBeenCalledWith(dto, 'agent', '127.0.0.1');
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockAuthResponse);
    });
  });

  describe('googleAuthCallback', () => {
    it('should handle Google OAuth callback', async () => {
      const mockProfile = {
        googleId: 'g-123',
        email: 'google@finora.com',
        fullName: 'Google User',
      };
      const mockReq = { user: mockProfile } as unknown as Parameters<
        typeof controller.googleAuthCallback
      >[0];
      service.loginWithGoogle!.mockResolvedValue(mockAuthResponse);

      const result = await controller.googleAuthCallback(
        mockReq,
        'agent',
        '127.0.0.1',
      );

      expect(service.loginWithGoogle).toHaveBeenCalledWith(
        mockProfile,
        'agent',
        '127.0.0.1',
      );
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockAuthResponse);
    });
  });

  describe('refreshToken', () => {
    it('should issue new tokens', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'valid.token' };
      service.refreshToken!.mockResolvedValue(mockTokensResponse);

      const result = await controller.refreshToken(dto, 'agent', '127.0.0.1');

      expect(service.refreshToken).toHaveBeenCalledWith(
        dto.refreshToken,
        'agent',
        '127.0.0.1',
      );
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockTokensResponse);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success message', async () => {
      service.logout!.mockResolvedValue(undefined);

      const result = await controller.logout(mockUserId, {
        refreshToken: 'some.token',
      });

      expect(service.logout).toHaveBeenCalledWith(mockUserId, 'some.token');
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile(mockUserResponse);

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockUserResponse);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword and return success message', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!',
      };
      service.changePassword!.mockResolvedValue(undefined);

      const result = await controller.changePassword(mockUserId, dto);

      expect(service.changePassword).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeNull();
    });
  });
});
