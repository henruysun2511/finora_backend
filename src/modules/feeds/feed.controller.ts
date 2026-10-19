import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/request/feed-query.dto';
import { AddPostReactionDto } from './dto/request/add-post-reaction.dto';
import { UpdateFeedPostDto } from './dto/request/update-feed-post.dto';
import { FeedPostResponseDto, UpdateFeedPostResponseDto } from './dto/response/feed-post-response.dto';
import {
  AddReactionResponseDto,
  PostReactionResponseDto,
  RemoveReactionResponseDto,
} from './dto/response/post-reaction-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Feed')
@ApiBearerAuth('access-token')
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.FEED_READ)
  @SwaggerDoc({
    summary: 'Lấy bảng tin bài đăng bạn bè',
    description:
      'Timeline các giao dịch được bạn bè (và chính bạn) chia sẻ với visibility = FRIENDS, mới nhất trước, phân trang. Số tiền bị ẩn (null) nếu tác giả bật amountHidden.',
    responseType: FeedPostResponseDto,
    isArray: true,
  })
  async getFeed(
    @CurrentUser('id') userId: string,
    @Query() query: FeedQueryDto,
  ): Promise<PaginatedResponse<FeedPostResponseDto>> {
    return this.feedService.getFeed(userId, query);
  }

  @Post(':transactionId/reactions')
  @Permissions(SYSTEM_PERMISSIONS.FEED_REACT)
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Thả hoặc đổi reaction',
    description:
      'Thả emoji vào bài đăng của bạn bè. Nếu đã thả emoji khác trước đó, hệ thống tự cập nhật sang emoji mới.',
    bodyType: AddPostReactionDto,
    responseType: AddReactionResponseDto,
  })
  @ApiParam({ name: 'transactionId', description: 'UUID của bài đăng (giao dịch)' })
  async addReaction(
    @CurrentUser('id') userId: string,
    @CurrentUser('fullName') fullName: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: AddPostReactionDto,
  ): Promise<ApiResponse<AddReactionResponseDto>> {
    const data = await this.feedService.addReaction(userId, fullName, transactionId, dto.emoji);
    return ApiResponse.success(data, 'Thả cảm xúc thành công');
  }

  @Delete(':transactionId/reactions')
  @Permissions(SYSTEM_PERMISSIONS.FEED_REACT)
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Gỡ bỏ reaction',
    description: 'Thu hồi cảm xúc đã thả trước đó trên bài đăng.',
    responseType: RemoveReactionResponseDto,
  })
  @ApiParam({ name: 'transactionId', description: 'UUID của bài đăng (giao dịch)' })
  async removeReaction(
    @CurrentUser('id') userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<ApiResponse<RemoveReactionResponseDto>> {
    const data = await this.feedService.removeReaction(userId, transactionId);
    return ApiResponse.success(data, data.message);
  }

  @Get(':transactionId/reactions')
  @Permissions(SYSTEM_PERMISSIONS.FEED_READ)
  @SwaggerDoc({
    summary: 'Danh sách người đã thả reaction',
    description: 'Danh sách đầy đủ người đã thả cảm xúc vào bài đăng, kèm emoji của từng người.',
    responseType: PostReactionResponseDto,
    isArray: true,
  })
  @ApiParam({ name: 'transactionId', description: 'UUID của bài đăng (giao dịch)' })
  async getReactions(
    @CurrentUser('id') userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<ApiResponse<PostReactionResponseDto[]>> {
    const data = await this.feedService.getReactions(userId, transactionId);
    return ApiResponse.success(data, 'Lấy danh sách cảm xúc thành công');
  }

  @Patch(':transactionId')
  @Permissions(SYSTEM_PERMISSIONS.FEED_UPDATE)
  @SwaggerDoc({
    summary: 'Chỉnh sửa bài đăng & cài đặt hiển thị',
    description:
      'Tác giả cập nhật visibility (chia sẻ / gỡ khỏi Bảng tin), amountHidden (ẩn / hiện số tiền) và note (caption) trong 1 request. Mọi trường đều tùy chọn.',
    bodyType: UpdateFeedPostDto,
    responseType: UpdateFeedPostResponseDto,
  })
  @ApiParam({ name: 'transactionId', description: 'UUID của bài đăng (giao dịch)' })
  async updatePost(
    @CurrentUser('id') userId: string,
    @CurrentUser('fullName') fullName: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: UpdateFeedPostDto,
  ): Promise<ApiResponse<UpdateFeedPostResponseDto>> {
    const data = await this.feedService.updatePost(userId, fullName, transactionId, dto);
    return ApiResponse.success(data, 'Cập nhật bài đăng thành công');
  }
}