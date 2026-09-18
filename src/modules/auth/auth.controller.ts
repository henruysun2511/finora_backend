import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { AuthTokensDto } from './dto/response/auth-tokens.dto';
import { UserResponseDto } from '../users/dto/response/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfileDto } from './strategies/google.strategy';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @SwaggerDoc({
    summary: 'Đăng ký tài khoản mới',
    description:
      'Đăng ký tài khoản bằng email và mật khẩu (tự động gán role USER)',
    responseType: AuthResponseDto,
    status: 201,
  })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Đăng ký tài khoản thành công',
      data,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Đăng nhập',
    description: 'Xác thực tài khoản và cấp cặp token JWT + Refresh Token',
    responseType: AuthResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    const data = await this.authService.login(dto, userAgent, ipAddress);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đăng nhập thành công',
      data,
    });
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @SwaggerDoc({
    summary: 'Đăng nhập qua Google OAuth2',
    description: 'Chuyển hướng người dùng sang trang xác thực của Google',
  })
  async googleAuth() {
    // Luồng chuyển hướng được xử lý tự động bởi GoogleAuthGuard
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @SwaggerDoc({
    summary: 'Google OAuth2 Callback',
    description:
      'Nhận kết quả xác thực từ Google và trả về cặp Token đăng nhập',
    responseType: AuthResponseDto,
  })
  async googleAuthCallback(
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    const googleProfile = (req as unknown as { user: GoogleProfileDto }).user;
    const data = await this.authService.loginWithGoogle(
      googleProfile,
      userAgent,
      ipAddress,
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đăng nhập Google thành công',
      data,
    });
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Cấp lại Access Token',
    description:
      'Nhận Refresh Token hợp lệ và cấp mới cặp Access Token / Refresh Token',
    responseType: AuthTokensDto,
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    const data = await this.authService.refreshToken(
      dto.refreshToken,
      userAgent,
      ipAddress,
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cấp mới token thành công',
      data,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Đăng xuất',
    description: 'Thu hồi token hiện tại của người dùng',
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto?: Partial<RefreshTokenDto>,
  ) {
    await this.authService.logout(userId, dto?.refreshToken);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đăng xuất thành công',
      data: null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @SwaggerDoc({
    summary: 'Thông tin cá nhân (Profile)',
    description:
      'Lấy thông tin tài khoản đang đăng nhập kèm danh sách vai trò và quyền hạn',
    responseType: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: UserResponseDto) {
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin tài khoản thành công',
      data: user,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Đổi mật khẩu',
    description: 'Đổi mật khẩu tài khoản và thu hồi các phiên đăng nhập cũ',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại',
      data: null,
    });
  }
}
