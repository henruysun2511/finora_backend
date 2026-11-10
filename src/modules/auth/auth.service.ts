import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtConfig } from '../../config/jwt.config';
import { TokenType } from '../../modules/auth/enums/token-type.enum';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { UsersService } from '../users/users.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { TokenRepository } from './repositories/token.repository';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { AuthTokensDto } from './dto/response/auth-tokens.dto';
import { GoogleProfileDto } from './strategies/google.strategy';
import { OAuth2Client } from 'google-auth-library';
import { GoogleConfig } from '../../config/google.config';
import * as crypto from 'crypto';
import { MailerService } from '../../infrastructures/mailer/mailer.service';
import { RedisService } from '../../infrastructures/redis/redis.service';
import { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import { VerifyOtpDto } from './dto/request/verify-otp.dto';
import { ResetPasswordDto } from './dto/request/reset-password.dto';
import {
  InvalidCredentialsException,
  InvalidTokenException,
  AccountInactiveException,
  OtpExpiredException,
  InvalidOtpException,
  TooManyOtpAttemptsException,
  InvalidResetTokenException,
} from './exceptions/auth.exception';
import {
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  UserNotFoundException,
} from '../users/exceptions/user.exception';
import { User } from '../users/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
    private readonly tokenRepository: TokenRepository,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
  ) {}

  // ── 1. Đăng ký tài khoản mới ──────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new UsernameAlreadyExistsException(dto.username);
    }

    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createAuthUser({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
    });

    // Tự động gán vai trò USER mặc định nếu có
    const defaultRole = await this.authorizationService.findRoleByCode('USER');
    if (defaultRole) {
      await this.usersService.assignRole(user.id, defaultRole.id);
    }

    const fullUser = await this.usersService.findById(user.id);
    const tokens = await this.generateTokens(fullUser!);

    return {
      ...tokens,
      user: this.usersService.toResponseDto(fullUser!),
    };
  }

  // ── 2. Đăng nhập Username / Mật khẩu ───────────────────────────────────────
  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByUsername(dto.username, true);
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

    this.auditLogsService.recordLog({
      userId: user.id,
      action: AUDIT_LOG_ACTION.LOGIN,
      entityType: AUDIT_LOG_ENTITY_TYPE.AUTH,
      entityId: user.id,
      ipAddress,
      userAgent,
      newValue: { username: user.username, email: user.email },
    });

    return {
      ...tokens,
      user: this.usersService.toResponseDto(user),
    };
  }

  // ── 3. Đăng nhập qua Google OAuth2 ────────────────────────────────────────
  async loginWithGoogle(
    profile: GoogleProfileDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    let user = profile.googleId
      ? await this.usersService.findByGoogleId(profile.googleId)
      : null;

    if (!user && profile.email) {
      user = await this.usersService.findByEmail(profile.email);
      if (user && !user.googleId) {
        await this.usersService.updateAuthUser(user.id, {
          googleId: profile.googleId,
          avatar: user.avatar ?? profile.avatar,
        });
      }
    }

    if (!user) {
      user = await this.usersService.createAuthUser({
        email: profile.email,
        fullName: profile.fullName,
        avatar: profile.avatar,
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        isActive: true,
      });

      const defaultRole =
        await this.authorizationService.findRoleByCode('USER');
      if (defaultRole) {
        await this.usersService.assignRole(user.id, defaultRole.id);
      }
    }

    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser || !fullUser.isActive) {
      throw new AccountInactiveException();
    }

    const tokens = await this.generateTokens(fullUser, userAgent, ipAddress);

    this.auditLogsService.recordLog({
      userId: fullUser.id,
      action: AUDIT_LOG_ACTION.LOGIN,
      entityType: AUDIT_LOG_ENTITY_TYPE.AUTH,
      entityId: fullUser.id,
      ipAddress,
      userAgent,
      newValue: { email: fullUser.email, provider: 'GOOGLE' },
    });

    return {
      ...tokens,
      user: this.usersService.toResponseDto(fullUser),
    };
  }

  // ── 3.1. Đăng nhập qua Google Token (Mobile ID Token / Web Access Token) ──
  async loginWithGoogleIdToken(
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const client = new OAuth2Client(GoogleConfig.CLIENT_ID || undefined);

    // 1. Thử xác thực theo ID Token (chuỗi JWT 3 đoạn dành cho Android / iOS)
    if (token.split('.').length === 3) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: GoogleConfig.CLIENT_ID ? [GoogleConfig.CLIENT_ID] : undefined,
        });

        const payload = ticket.getPayload();
        if (payload && payload.email) {
          const profile: GoogleProfileDto = {
            googleId: payload.sub,
            email: payload.email,
            fullName: payload.name ?? 'Google User',
            avatar: payload.picture,
          };
          return this.loginWithGoogle(profile, userAgent, ipAddress);
        }
      } catch (err) {
        if (err instanceof AccountInactiveException) throw err;
        // Nếu verifyIdToken lỗi, tiếp tục thử kiểm tra access token bên dưới
      }
    }

    // 2. Thử xác thực theo Access Token (dành cho Web GIS popup flow)
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const userInfo = (await response.json()) as {
          sub: string;
          email: string;
          name?: string;
          picture?: string;
        };

        if (userInfo.email) {
          const profile: GoogleProfileDto = {
            googleId: userInfo.sub,
            email: userInfo.email,
            fullName: userInfo.name ?? userInfo.email.split('@')[0],
            avatar: userInfo.picture,
          };
          return this.loginWithGoogle(profile, userAgent, ipAddress);
        }
      }
    } catch (err) {
      if (err instanceof AccountInactiveException) throw err;
    }

    throw new InvalidTokenException(
      'Mã xác thực Google không hợp lệ hoặc đã hết hạn',
    );
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

    const user = await this.usersService.findById(userId);
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

    this.auditLogsService.recordLog({
      userId,
      action: AUDIT_LOG_ACTION.LOGOUT,
      entityType: AUDIT_LOG_ENTITY_TYPE.AUTH,
      entityId: userId,
    });
  }

  // ── 6. Đổi mật khẩu ───────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const userWithPassword = await this.usersService.findByEmail(
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
    await this.usersService.updateAuthUser(userId, { password: newHashed });

    // Hủy toàn bộ token cũ để buộc đăng nhập lại
    await this.tokenRepository.revokeAllUserTokens(userId);

    this.auditLogsService.recordLog({
      userId,
      action: AUDIT_LOG_ACTION.PASSWORD_CHANGE,
      entityType: AUDIT_LOG_ENTITY_TYPE.AUTH,
      entityId: userId,
    });
  }

  // ── 7. Quên mật khẩu: Gửi mã xác thực OTP 6 số qua Email (30 giây) ────────
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ email: string; expiresIn: number }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UserNotFoundException(dto.email);
    }

    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    // Sinh ngẫu nhiên mã OTP 6 chữ số
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresInSeconds = 180; // 30 giây hiệu lực theo yêu cầu
    const otpKey = `otp:pwd-reset:${normalizedEmail}`;

    // Lưu mã OTP vào Redis (kèm fallback bộ nhớ) với thời hạn 30 giây
    await this.redisService.set(
      otpKey,
      { code: otp, attempts: 0, userId: user.id },
      expiresInSeconds,
    );

    // Ghi log mã OTP lên console server (cực kỳ hữu ích khi test hoặc khi SMTP bị chặn cổng trên Cloud)
    this.logger.log(
      `🔑 [OTP QUÊN MẬT KHẨU] Email: ${user.email} | OTP: [${otp}] | Hiệu lực: ${expiresInSeconds}s`,
    );

    // Gửi email chứa mã OTP xác nhận
    const emailSent = await this.mailerService.sendPasswordResetEmail(
      user.email,
      user.fullName || 'Người dùng',
      otp,
      expiresInSeconds,
    );

    if (!emailSent) {
      this.logger.warn(
        `⚠️ Không thể gửi email OTP đến ${user.email}. Vui lòng kiểm tra cấu hình SMTP hoặc firewall outbound trên server. Sử dụng mã OTP trong log để tiếp tục test: [${otp}]`,
      );
    }

    // Mask email trước khi trả về client để bảo mật (ví dụ: hu***1@gmail.com)
    const [localPart, domain] = user.email.split('@');
    const maskedLocal =
      localPart.length > 2
        ? `${localPart.slice(0, 2)}***${localPart.slice(-1)}`
        : `${localPart[0]}***`;
    const maskedEmail = `${maskedLocal}@${domain}`;

    return {
      email: maskedEmail,
      expiresIn: expiresInSeconds,
    };
  }

  // ── 8. Xác thực mã OTP trong vòng 30 giây ─────────────────────────────────
  async verifyForgotPasswordOtp(
    dto: VerifyOtpDto,
  ): Promise<{ resetToken: string; expiresIn: number }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const otpKey = `otp:pwd-reset:${normalizedEmail}`;

    const record = await this.redisService.get<{
      code: string;
      attempts: number;
      userId: string;
    }>(otpKey);

    if (!record) {
      throw new OtpExpiredException();
    }

    if (record.code !== dto.otp.trim()) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 3) {
        await this.redisService.del(otpKey);
        throw new TooManyOtpAttemptsException();
      }
      // Cập nhật lại số lần đã thử với TTL còn lại 30s
      await this.redisService.set(otpKey, record, 180);
      throw new InvalidOtpException(
        `Mã OTP không chính xác. Bạn còn ${3 - record.attempts} lần thử.`,
      );
    }

    // OTP chính xác -> Xóa mã OTP ngay để chống tái sử dụng (Single-use)
    await this.redisService.del(otpKey);

    // Sinh resetToken bảo mật có thời hạn 5 phút (300s) để cho phép đặt mật khẩu mới
    const resetToken = `rst_${crypto.randomBytes(32).toString('hex')}`;
    const tokenKey = `pwd-reset:token:${resetToken}`;
    await this.redisService.set(
      tokenKey,
      { userId: record.userId, email: normalizedEmail },
      300,
    );

    return {
      resetToken,
      expiresIn: 300,
    };
  }

  // ── 9. Đặt lại mật khẩu mới bằng Reset Token ──────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenKey = `pwd-reset:token:${dto.resetToken.trim()}`;
    const session = await this.redisService.get<{
      userId: string;
      email: string;
    }>(tokenKey);

    if (!session || !session.userId) {
      throw new InvalidResetTokenException();
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updateAuthUser(session.userId, {
      password: hashedPassword,
    });

    // Hủy resetToken ngay sau khi dùng xong
    await this.redisService.del(tokenKey);

    // Thu hồi toàn bộ session đăng nhập cũ của người dùng
    await this.tokenRepository.revokeAllUserTokens(session.userId);

    this.auditLogsService.recordLog({
      userId: session.userId,
      action: AUDIT_LOG_ACTION.PASSWORD_CHANGE,
      entityType: AUDIT_LOG_ENTITY_TYPE.AUTH,
      entityId: session.userId,
      newValue: { reason: 'FORGOT_PASSWORD_RESET' },
    });

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
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
