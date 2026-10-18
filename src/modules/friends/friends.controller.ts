// src/modules/friends/friends.controller.ts
import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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
    bearerAuth: true,
  })
  async searchUsers(
    @CurrentUser('id') userId: string,
    @Query() queryDto: SearchUserQueryDto,
  ) {
    const data = await this.friendsService.searchUsers(userId, queryDto);
    return ApiResponse.success(data, 'Tìm kiếm người dùng thành công');
  }

  @Post('request')
  @SwaggerDoc({
    summary: '2. Gửi lời mời kết bạn',
    description: 'Gửi yêu cầu kết bạn đến một người dùng khác.',
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

  @Get('pending-requests')
  @SwaggerDoc({
    summary: '3. Xem lời mời đang chờ',
    description: 'Lấy danh sách các lời mời kết bạn đang chờ phản hồi.',
    bearerAuth: true,
  })
  async getPendingRequests(@CurrentUser('id') userId: string) {
    const data = await this.friendsService.getPendingRequests(userId);
    return ApiResponse.success(data, 'Lấy danh sách lời mời chờ duyệt thành công');
  }

  @Post('request/:id/accept')
  @SwaggerDoc({
    summary: '4. Chấp nhận kết bạn',
    description: 'Chấp nhận lời mời kết bạn dựa theo ID bản ghi lời mời.',
    bearerAuth: true,
  })
  async acceptRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.friendsService.acceptRequest(userId, id);
    return ApiResponse.success(data, 'Đã chấp nhận lời mời kết bạn');
  }

  @Post('request/:id/reject')
  @SwaggerDoc({
    summary: '5. Từ chối kết bạn',
    description: 'Từ chối lời mời kết bạn dựa theo ID bản ghi lời mời.',
    bearerAuth: true,
  })
  async rejectRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.friendsService.rejectRequest(userId, id);
    return ApiResponse.success(data, 'Đã từ chối lời mời kết bạn');
  }

  @Get()
  @SwaggerDoc({
    summary: '6. Lấy danh bạ bạn bè',
    description: 'Lấy danh sách bạn bè đã được chấp nhận (hỗ trợ phân trang).',
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

  @Post(':id/block')
  @SwaggerDoc({
    summary: '8. Chặn người dùng',
    description: 'Chặn một người dùng khỏi hệ thống liên lạc và chia sẻ.',
    bearerAuth: true,
  })
  async blockUser(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.friendsService.blockUser(userId, id);
    return ApiResponse.success(data, 'Đã chặn người dùng thành công');
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