// src/modules/friends/friends.controller.ts
import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { SendFriendRequestDto } from './dto/request/send-friend-request.dto';
import { FriendQueryDto } from './dto/request/friend-query.dto';
import { SearchUserQueryDto } from './dto/request/search-user-query.dto';
import { FriendResponseDto } from './dto/response/friend-response.dto';
import { FriendshipStatusResponseDto } from './dto/response/friend-status-response.dto';

@ApiTags('Friends')
@Controller('api/v1/friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('search')
  @SwaggerDoc({
    summary: '1. Tìm kiếm người dùng',
    description: 'Tìm kiếm người dùng theo từ khóa tên hoặc email để kết bạn.',
    responseType: FriendResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async searchUsers(
    @CurrentUser('id') userId: string,
    @Query() queryDto: SearchUserQueryDto,
  ) {
    const data = await this.friendsService.searchUsers(userId, queryDto);
    return ApiResponse.success(data, 'Tìm kiếm người dùng thành công');
  }

  @Post('requests')
  @SwaggerDoc({
    summary: '2. Gửi lời mời kết bạn',
    description: 'Gửi yêu cầu kết bạn đến một người dùng khác (Tạo tài nguyên request mới).',
    bodyType: SendFriendRequestDto,
    status: 201,
    bearerAuth: true,
  })
  async sendRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendFriendRequestDto,
  ) {
    const data = await this.friendsService.sendRequest(userId, dto);
    return ApiResponse.created(data, 'Gửi lời mời kết bạn thành công');
  }

  @Get('requests')
  @SwaggerDoc({
    summary: '3. Xem danh sách lời mời kết bạn đang chờ',
    description: 'Lấy danh sách các yêu cầu kết bạn đang chờ phản hồi.',
    responseType: FriendResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getPendingRequests(@CurrentUser('id') userId: string) {
    const data = await this.friendsService.getPendingRequests(userId);
    return ApiResponse.success(data, 'Lấy danh sách lời mời chờ duyệt thành công');
  }

  @Patch('requests/:id')
  @SwaggerDoc({
    summary: '4 & 5. Cập nhật trạng thái lời mời kết bạn (Chấp nhận / Từ chối)',
    description: 'Cập nhật trạng thái lời mời (ví dụ: chuyển thành ACCEPTED hoặc REJECTED).',
    bearerAuth: true,
  })
  async updateRequestStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { status: 'ACCEPTED' | 'REJECTED' }, // Dùng DTO chuyên dụng trong thực tế
  ) {
    // Tùy theo logic service của bạn để xử lý phân nhánh Accept hoặc Reject dựa trên body.status
    const data = body.status === 'ACCEPTED' 
      ? await this.friendsService.acceptRequest(userId, id)
      : await this.friendsService.rejectRequest(userId, id);
      
    const message = body.status === 'ACCEPTED' ? 'Đã chấp nhận kết bạn' : 'Đã từ chối lời mời kết bạn';
    return ApiResponse.success(data, message);
  }

  @Get()
  @SwaggerDoc({
    summary: '6. Lấy danh bạ bạn bè',
    description: 'Lấy danh sách bạn bè đã được chấp nhận (hỗ trợ phân trang).',
    responseType: FriendResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getFriends(
    @CurrentUser('id') userId: string,
    @Query() queryDto: FriendQueryDto,
  ) {
    const result = await this.friendsService.getFriends(userId, queryDto);
    return ApiResponse.success(result.data, 'Lấy danh bạ bạn bè thành công');
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: '7. Hủy kết bạn (Unfriend)',
    description: 'Xóa quan hệ bạn bè với một người dùng.',
    bearerAuth: true,
  })
  async unfriend(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.friendsService.unfriend(userId, id);
    return ApiResponse.success(null, 'Hủy kết bạn thành công');
  }

  @Patch(':id/status')
  @SwaggerDoc({
    summary: '8. Cập nhật trạng thái quan hệ (Chặn người dùng)',
    description: 'Chặn hoặc thay đổi trạng thái quan hệ với người dùng.',
    bearerAuth: true,
  })
  async updateFriendshipStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { status: 'BLOCKED' | 'ACTIVE' },
  ) {
    const data = await this.friendsService.blockUser(userId, id);
    return ApiResponse.success(data, 'Đã cập nhật trạng thái người dùng thành công');
  }

  @Get(':targetUserId/status')
  @SwaggerDoc({
    summary: '9. Kiểm tra trạng thái quan hệ',
    description: 'Kiểm tra trạng thái quan hệ giữa user hiện tại và targetUserId.',
    responseType: FriendshipStatusResponseDto,
    bearerAuth: true,
  })
  async getStatus(
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const data = await this.friendsService.getStatus(userId, targetUserId);
    return ApiResponse.success(data, 'Lấy trạng thái quan hệ thành công');
  }
}