import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtConfig } from '../../config/jwt.config';
import { TokenType } from '../../common/enums/token-type.enum';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { UserRepository } from '../users/repository/user.repository';
import { UserRoleRepository } from '../users/repository/user-role.repository';
import { UserMapper } from '../users/mapper/user.mapper';
import { RoleRepository } from '../authorization/repository/role.repository';
import { TokenRepository } from './repository/token.repository';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { AuthTokensDto } from './dto/response/auth-tokens.dto';
import { GoogleProfileDto } from './strategies/google.strategy';
import {
  InvalidCredentialsException,
  InvalidTokenException,
  AccountInactiveException,
} from './exceptions/auth.exception';
import { EmailAlreadyExistsException } from '../users/exceptions/user.exception';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly roleRepository: RoleRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly userMapper: UserMapper,
    private readonly jwtService: JwtService,
  ) {}

  // ── 1. Đăng ký tài khoản mới ──────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
    });

    // Tự động gán vai trò USER mặc định nếu có
    const defaultRole = await this.roleRepository.findByCode('USER');
    if (defaultRole) {
      await this.userRoleRepository.assignRole(user.id, defaultRole.id);
    }

    const fullUser = await this.userRepository.findById(user.id);
    const tokens = await this.generateTokens(fullUser!);

    return {
      ...tokens,
      user: this.userMapper.toResponseDto(fullUser!),
    };
  }

  // ── 2. Đăng nhập Email / Mật khẩu ─────────────────────────────────────────
  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user || !user.password) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    return {
      ...tokens,
      user: this.userMapper.toResponseDto(user),
    };
  }

  // ── 3. Đăng nhập qua Google OAuth2 ────────────────────────────────────────
  async loginWithGoogle(
    profile: GoogleProfileDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    let user = profile.googleId
      ? await this.userRepository.findByGoogleId(profile.googleId)
      : null;

    if (!user && profile.email) {
      user = await this.userRepository.findByEmail(profile.email);
      if (user && !user.googleId) {
        await this.userRepository.update(user.id, {
          googleId: profile.googleId,
          avatar: user.avatar ?? profile.avatar,
        });
      }
    }

    if (!user) {
      user = await this.userRepository.create({
        email: profile.email,
        fullName: profile.fullName,
        avatar: profile.avatar,
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        isActive: true,
      });

      const defaultRole = await this.roleRepository.findByCode('USER');
      if (defaultRole) {
        await this.userRoleRepository.assignRole(user.id, defaultRole.id);
      }
    }

    const fullUser = await this.userRepository.findById(user.id);
    if (!fullUser || !fullUser.isActive) {
      throw new AccountInactiveException();
    }

    const tokens = await this.generateTokens(fullUser, userAgent, ipAddress);

    return {
      ...tokens,
      user: this.userMapper.toResponseDto(fullUser),
    };
  }

  // ── 4. Cấp lại Token từ Refresh Token ──────────────────────────────────────
  async refreshToken(
    refreshTokenStr: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokensDto> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshTokenStr, {
        secret: JwtConfig.REFRESH_SECRET,
      });
    } catch {
      throw new InvalidTokenException(
        'Refresh Token không hợp lệ hoặc đã hết hạn',
      );
    }

    const userId = payload.sub;
    const validToken = await this.tokenRepository.findValidToken(
      userId,
      refreshTokenStr,
      TokenType.REFRESH_TOKEN,
    );

    if (!validToken) {
      throw new InvalidTokenException(
        'Refresh Token đã bị thu hồi hoặc không tồn tại',
      );
    }

    // Thu hồi token cũ để quay vòng (Token Rotation)
    await this.tokenRepository.revokeToken(userId, refreshTokenStr);

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new AccountInactiveException();
    }

    return this.generateTokens(user, userAgent, ipAddress);
  }

  // ── 5. Đăng xuất ──────────────────────────────────────────────────────────
  async logout(userId: string, refreshTokenStr?: string): Promise<void> {
    if (refreshTokenStr) {
      await this.tokenRepository.revokeToken(userId, refreshTokenStr);
    } else {
      await this.tokenRepository.revokeAllUserTokens(
        userId,
        TokenType.REFRESH_TOKEN,
      );
    }
  }

  // ── 6. Đổi mật khẩu ───────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const userWithPassword = await this.userRepository.findByEmail(
      user.email,
      true,
    );
    if (!userWithPassword?.password) {
      throw new InvalidCredentialsException();
    }

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      userWithPassword.password,
    );
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }

    const newHashed = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(userId, { password: newHashed });

    // Hủy toàn bộ token cũ để buộc đăng nhập lại
    await this.tokenRepository.revokeAllUserTokens(userId);
  }

  // ── Helper: Tạo cặp Access Token & Refresh Token ──────────────────────────
  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokensDto> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: JwtConfig.SECRET,
      expiresIn: JwtConfig.EXPIRES_IN as string,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: JwtConfig.REFRESH_SECRET,
      expiresIn: JwtConfig.REFRESH_EXPIRES_IN as string,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Mặc định 7 ngày

    await this.tokenRepository.saveToken(
      user.id,
      refreshToken,
      TokenType.REFRESH_TOKEN,
      expiresAt,
      userAgent,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: JwtConfig.EXPIRES_IN,
    };
  }
}
