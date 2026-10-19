import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { SendFriendRequestDto } from './dto/request/send-friend-request.dto';
import { FriendQueryDto } from './dto/request/friend-query.dto';
import { SearchUserQueryDto } from './dto/request/search-user-query.dto';
import { PendingRequestQueryDto } from './dto/request/pending-request-query.dto';
import { RespondFriendRequestDto } from './dto/request/respond-friend-request.dto';
import { RespondFriendRequestStatus } from './enums/respond-friend-request-status.enum';
import { PendingRequestType } from './enums/pending-request-type.enum';
import { UpdateFriendshipStatusDto } from './dto/request/update-friendship-status.dto';
import { FriendResponseDto } from './dto/response/friend-response.dto';
import { SearchUserResultDto } from './dto/response/search-user-response.dto';
import { PendingFriendRequestResponseDto } from './dto/response/pending-request-response.dto';
import { FriendshipStatusResponseDto } from './dto/response/friend-status-response.dto';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('search')
  @SwaggerDoc({
    summary: '1. Tìm kiếm người dùng',
    description: 'Tìm kiếm người dùng theo từ khóa tên hoặc email và trả về trạng thái quan hệ.',
    responseType: SearchUserResultDto,
    isArray: true,
    bearerAuth: true,
  })
  async searchUsers(
    @CurrentUser('id') userId: string,
    @Query() queryDto: SearchUserQueryDto,
  ): Promise<ApiResponse<SearchUserResultDto[]>> {
    const data = await this.friendsService.searchUsers(userId, queryDto);
    return ApiResponse.success(data, 'Tìm kiếm người dùng thành công');
  }

  @Post('requests')
  @SwaggerDoc({
    summary: '2. Gửi lời mời kết bạn',
    description: 'Gửi yêu cầu kết bạn đến một người dùng khác (hỗ trợ Auto-Accept nếu đối phương đã gửi trước).',
    bodyType: SendFriendRequestDto,
    status: 201,
    bearerAuth: true,
  })
  async sendRequest(
    @CurrentUser('id') userId: string,
    @CurrentUser('fullName') userFullName: string,
    @Body() dto: SendFriendRequestDto,
  ) {
    const data = await this.friendsService.sendRequest(userId, userFullName, dto);
    return ApiResponse.created(data, 'Gửi lời mời kết bạn thành công');
  }

  @Get('requests')
  @SwaggerDoc({
    summary: '3. Xem danh sách lời mời kết bạn đang chờ',
    description: 'Lấy danh sách các yêu cầu kết bạn đang chờ (nhận được hoặc đã gửi đi).',
    responseType: PendingFriendRequestResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getPendingRequests(
    @CurrentUser('id') userId: string,
    @Query() query: PendingRequestQueryDto,
  ): Promise<ApiResponse<PendingFriendRequestResponseDto[]>> {
    const data = await this.friendsService.getPendingRequests(userId, query);
    return ApiResponse.success(data, 'Lấy danh sách lời mời chờ duyệt thành công');
  }

  @Patch('requests/:id')
  @SwaggerDoc({
    summary: '4 & 5. Phản hồi lời mời kết bạn (Chấp nhận / Từ chối)',
    description: 'Chấp nhận (ACCEPTED) hoặc Từ chối (REJECTED) lời mời kết bạn.',
    bodyType: RespondFriendRequestDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của bản ghi lời mời kết bạn' })
  async updateRequestStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('fullName') userFullName: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    const data =
      dto.status === RespondFriendRequestStatus.ACCEPTED
        ? await this.friendsService.acceptRequest(userId, userFullName, id)
        : await this.friendsService.rejectRequest(userId, id);

    const message =
      dto.status === RespondFriendRequestStatus.ACCEPTED
        ? 'Đã chấp nhận kết bạn'
        : 'Đã từ chối lời mời kết bạn';

    return ApiResponse.success(data, message);
  }

  @Get()
  @SwaggerDoc({
    summary: '6. Lấy danh bạ bạn bè',
    description: 'Lấy danh sách bạn bè đã được chấp nhận kết bạn (hỗ trợ phân trang chuẩn).',
    responseType: FriendResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getFriends(
    @CurrentUser('id') userId: string,
    @Query() queryDto: FriendQueryDto,
  ): Promise<PaginatedResponse<FriendResponseDto>> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const result = await this.friendsService.getFriends(userId, queryDto);

    return PaginatedResponse.of(result.items, result.total, page, limit);
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: '7. Hủy kết bạn (Unfriend)',
    description: 'Xóa quan hệ bạn bè với một người dùng.',
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của người bạn cần hủy kết bạn' })
  async unfriend(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.friendsService.unfriend(userId, id);
    return ApiResponse.success(null, 'Hủy kết bạn thành công');
  }

  @Patch(':id/status')
  @SwaggerDoc({
    summary: '8. Chặn người dùng (Block)',
    description: 'Chặn một người dùng để ngăn chặn tương tác xã hội.',
    bodyType: UpdateFriendshipStatusDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của người dùng cần chặn' })
  async updateFriendshipStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: UpdateFriendshipStatusDto,
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
  @ApiParam({ name: 'targetUserId', description: 'UUID của người dùng cần kiểm tra trạng thái' })
  async getStatus(
    @CurrentUser('id') userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ): Promise<ApiResponse<FriendshipStatusResponseDto>> {
    const data = await this.friendsService.getStatus(userId, targetUserId);
    return ApiResponse.success(data, 'Lấy trạng thái quan hệ thành công');
  }
}