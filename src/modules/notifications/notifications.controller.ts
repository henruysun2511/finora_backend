import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/request/notification-query.dto';
import { NotificationResponseDto } from './dto/response/notification-response.dto';
import { UnreadCountResponseDto } from './dto/response/unread-count-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của người dùng',
    description: 'Lấy danh sách thông báo phân trang, hỗ trợ lọc theo trạng thái đã đọc (isRead) và theo loại thông báo (type).',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Danh sách thông báo phân trang',
    type: [NotificationResponseDto],
  })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    return this.notificationsService.getNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Lấy số lượng thông báo chưa đọc',
    description: 'Trả về số lượng thông báo chưa đọc để hiển thị số badge trên thanh điều hướng/icon chuông.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Số lượng thông báo chưa đọc',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<UnreadCountResponseDto>> {
    const data = await this.notificationsService.getUnreadCount(userId);
    return ApiResponse.success(data);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo là đã đọc',
    description: 'Cập nhật toàn bộ thông báo chưa đọc của người dùng thành đã đọc và đẩy realtime unreadCount = 0 qua Socket.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Đánh dấu tất cả đã đọc thành công',
  })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<{ affected: number }>> {
    const data = await this.notificationsService.markAllAsRead(userId);
    return ApiResponse.success(data, 'Đã đánh dấu tất cả thông báo là đã đọc');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu một thông báo là đã đọc',
    description: 'Cập nhật trạng thái một thông báo thành đã đọc khi người dùng click vào thông báo.',
  })
  @ApiParam({ name: 'id', description: 'UUID của thông báo' })
  @SwaggerResponse({
    status: 200,
    description: 'Thông báo đã cập nhật',
    type: NotificationResponseDto,
  })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<NotificationResponseDto>> {
    const data = await this.notificationsService.markAsRead(userId, id);
    return ApiResponse.success(data, 'Đã đánh dấu thông báo là đã đọc');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa thông báo',
    description: 'Xóa mềm một thông báo khỏi danh sách của người dùng.',
  })
  @ApiParam({ name: 'id', description: 'UUID của thông báo' })
  @SwaggerResponse({
    status: 200,
    description: 'Xóa thông báo thành công',
  })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.notificationsService.deleteNotification(userId, id);
    return ApiResponse.success(null, 'Xóa thông báo thành công');
  }
}
