// src/modules/settings/settings.controller.ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMascotSettingsDto } from './dto/request/update-mascot-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/request/update-general-settings.dto';
import { UpdateAiSettingsDto } from './dto/request/update-ai-settings.dto';
import { UpdateNotificationPreferencesDto } from './dto/request/update-notification-preferences.dto';
import { SetupPinDto } from './dto/request/setup-pin.dto';
import { VerifyPinDto } from './dto/request/verify-pin.dto';
import { ChangePinDto } from './dto/request/change-pin.dto';
import { DisableAppLockDto } from './dto/request/disable-app-lock.dto';
import { UserSettingsResponseDto } from './dto/response/user-settings-response.dto';
import { VerifyPinResponseDto } from './dto/response/verify-pin-response.dto';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @SwaggerDoc({
    summary: 'Lấy toàn bộ cài đặt người dùng hiện tại',
    description: 'Bao gồm cài đặt chung, tiền tệ, hiển thị mascot, tone giọng điệu, bảo mật và thông báo',
    responseType: UserSettingsResponseDto,
  })
  async getSettings(@CurrentUser('id') userId: string) {
    const data = await this.settingsService.getSettings(userId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin cài đặt thành công',
      data,
    });
  }

  @Patch('mascot')
  @SwaggerDoc({
    summary: 'Cập nhật cấu hình phản hồi của linh vật AI',
    description: 'Tùy chỉnh bật/tắt hiển thị, phong cách phản hồi (GENTLE, BALANCED, ROAST) và độ nhạy cảnh báo',
    responseType: UserSettingsResponseDto,
  })
  async updateMascotSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMascotSettingsDto,
  ) {
    const data = await this.settingsService.updateMascotSettings(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật cài đặt linh vật thành công',
      data,
    });
  }

  @Patch('general')
  @SwaggerDoc({
    summary: 'Cập nhật cài đặt chung',
    description: 'Tùy chỉnh đơn vị tiền tệ mặc định, ngôn ngữ, quyền riêng tư giao dịch',
    responseType: UserSettingsResponseDto,
  })
  async updateGeneralSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGeneralSettingsDto,
  ) {
    const data = await this.settingsService.updateGeneralSettings(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật cài đặt chung thành công',
      data,
    });
  }

  @Patch('notifications')
  @SwaggerDoc({
    summary: 'Cập nhật tùy chọn nhận thông báo',
    description: 'Tùy chỉnh bật/tắt thông báo đẩy, email, cảnh báo ngân sách, hạn nợ, tiến hóa linh vật',
    responseType: UserSettingsResponseDto,
  })
  async updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const data = await this.settingsService.updateNotificationPreferences(
      userId,
      dto,
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật tùy chọn thông báo thành công',
      data,
    });
  }

  @Post('security/setup-pin')
  @SwaggerDoc({
    summary: 'Thiết lập mã PIN bảo mật lần đầu',
    description: 'Thiết lập mã PIN 4-6 chữ số và tự động kích hoạt tính năng khóa ứng dụng (App Lock)',
    responseType: UserSettingsResponseDto,
  })
  async setupPin(
    @CurrentUser('id') userId: string,
    @Body() dto: SetupPinDto,
  ) {
    const data = await this.settingsService.setupPin(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Thiết lập mã PIN bảo mật thành công',
      data,
    });
  }

  @Post('security/verify-pin')
  @SwaggerDoc({
    summary: 'Xác thực mã PIN bảo mật khi mở ứng dụng',
    description: 'Có cơ chế rate-limiting chống Brute-force: nhập sai quá 5 lần sẽ khóa tạm thời 15 phút',
    responseType: VerifyPinResponseDto,
  })
  async verifyPin(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPinDto,
  ) {
    const data = await this.settingsService.verifyPin(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    });
  }

  @Patch('security/change-pin')
  @SwaggerDoc({
    summary: 'Đổi mã PIN bảo mật',
    description: 'Yêu cầu nhập đúng mã PIN cũ để đổi sang mã PIN mới',
    responseType: UserSettingsResponseDto,
  })
  async changePin(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePinDto,
  ) {
    const data = await this.settingsService.changePin(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đổi mã PIN bảo mật thành công',
      data,
    });
  }

  @Post('security/disable-app-lock')
  @SwaggerDoc({
    summary: 'Tắt tính năng khóa ứng dụng',
    description: 'Yêu cầu xác thực mã PIN trước khi tắt khóa ứng dụng',
    responseType: UserSettingsResponseDto,
  })
  async disableAppLock(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableAppLockDto,
  ) {
    const data = await this.settingsService.disableAppLock(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Tắt khóa ứng dụng thành công',
      data,
    });
  }

  @Patch('ai')
  @SwaggerDoc({
    summary: 'Cập nhật cấu hình mô hình AI & API Key riêng (BYOK)',
    description: 'Cho phép người dùng chọn provider (GEMINI, OPENAI), model tùy chỉnh và nhập API Key cá nhân. Nếu không nhập hoặc truyền rỗng, hệ thống tự động fallback về API Key của hệ thống.',
    responseType: UserSettingsResponseDto,
  })
  async updateAiSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    const data = await this.settingsService.updateAiSettings(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật cấu hình mô hình AI thành công',
      data,
    });
  }

  @Delete('ai/api-key')
  @SwaggerDoc({
    summary: 'Xóa API Key riêng để quay lại dùng API Key mặc định của hệ thống',
    description: 'Xóa custom API Key của người dùng, khôi phục việc sử dụng API Key hệ thống trong .env',
    responseType: UserSettingsResponseDto,
  })
  async deleteCustomApiKey(@CurrentUser('id') userId: string) {
    const data = await this.settingsService.deleteCustomApiKey(userId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Đã xóa API Key cá nhân và chuyển về dùng API Key hệ thống',
      data,
    });
  }
}
