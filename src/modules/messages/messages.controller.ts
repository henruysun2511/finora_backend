import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/request/send-message.dto';
import { MessageHistoryQueryDto } from './dto/request/message-history-query.dto';
import { AddMessageReactionDto } from './dto/request/add-message-reaction.dto';
import { MessageResponseDto } from './dto/response/message-response.dto';
import { ConversationResponseDto } from './dto/response/conversation-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ── API 1: GET /api/v1/messages/conversations ─────────────────────────────

  @Get('conversations')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_READ)
  @SwaggerDoc({
    summary: '1. Danh sách cuộc trò chuyện gần nhất',
    description: 'Lấy danh sách cuộc trò chuyện gần nhất với avatar, tên bạn bè, tin nhắn cuối cùng và số tin chưa đọc.',
    responseType: ConversationResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<ConversationResponseDto[]>> {
    const data = await this.messagesService.getConversations(userId, search);
    return ApiResponse.success(data, 'Lấy danh sách cuộc trò chuyện thành công');
  }

  // ── API 2: GET /api/v1/messages/:friendId ─────────────────────────────────

  @Get(':friendId')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_READ)
  @SwaggerDoc({
    summary: '2. Lấy lịch sử tin nhắn với một người bạn',
    description: 'Lấy lịch sử tin nhắn phân trang giữa user hiện tại và friendId.',
    responseType: MessageResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  @ApiParam({ name: 'friendId', description: 'UUID của người bạn' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Query() query: MessageHistoryQueryDto,
  ): Promise<PaginatedResponse<MessageResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.messagesService.getHistory(userId, friendId, query);
    return PaginatedResponse.of(result.items, result.total, page, limit);
  }

  // ── API 3: POST /api/v1/messages ──────────────────────────────────────────

  @Post()
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_CREATE)
  @SwaggerDoc({
    summary: '3. Gửi tin nhắn mới',
    description: 'Gửi tin nhắn trực tiếp đến bạn bè. Hỗ trợ trả lời tin nhắn (replyToMessageId) và đính kèm bài đăng chi tiêu (relatedTransactionId).',
    bodyType: SendMessageDto,
    responseType: MessageResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse<MessageResponseDto>> {
    const data = await this.messagesService.sendMessage(userId, dto);
    return ApiResponse.created(data, 'Gửi tin nhắn thành công');
  }

  // ── API 4: PATCH /api/v1/messages/:friendId/read ──────────────────────────

  @Patch(':friendId/read')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_UPDATE)
  @SwaggerDoc({
    summary: '4. Đánh dấu cuộc trò chuyện đã đọc',
    description: 'Đánh dấu tất cả tin nhắn từ friendId gửi cho user hiện tại thành đã đọc.',
    bearerAuth: true,
  })
  @ApiParam({ name: 'friendId', description: 'UUID của người bạn' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ): Promise<ApiResponse<{ affected: number }>> {
    const data = await this.messagesService.markAsRead(userId, friendId);
    return ApiResponse.success(data, 'Đánh dấu đã đọc thành công');
  }

  // ── API 5: DELETE /api/v1/messages/:id ────────────────────────────────────

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_DELETE)
  @SwaggerDoc({
    summary: '5. Thu hồi tin nhắn',
    description: 'Thu hồi (xóa mềm) tin nhắn trong vòng 15 phút kể từ lúc gửi. Chỉ người gửi mới có quyền thu hồi.',
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của tin nhắn cần thu hồi' })
  async recallMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.messagesService.recallMessage(userId, id);
    return ApiResponse.noContent('Thu hồi tin nhắn thành công');
  }

  // ── API 6: POST /api/v1/messages/:id/reactions ────────────────────────────

  @Post(':id/reactions')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_CREATE)
  @SwaggerDoc({
    summary: '6. Thả cảm xúc vào tin nhắn',
    description: 'Thả hoặc đổi emoji cảm xúc trên một tin nhắn. Mỗi user chỉ có tối đa 1 reaction trên 1 tin nhắn.',
    bodyType: AddMessageReactionDto,
    status: 201,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của tin nhắn' })
  async addReaction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageReactionDto,
  ): Promise<ApiResponse<null>> {
    await this.messagesService.addReaction(userId, id, dto);
    return ApiResponse.created(null, 'Thả cảm xúc thành công');
  }

  // ── API 7: DELETE /api/v1/messages/:id/reactions ──────────────────────────

  @Delete(':id/reactions')
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_DELETE)
  @SwaggerDoc({
    summary: '7. Gỡ bỏ cảm xúc trên tin nhắn',
    description: 'Gỡ bỏ emoji cảm xúc mà user đã thả trên tin nhắn.',
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của tin nhắn' })
  async removeReaction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.messagesService.removeReaction(userId, id);
    return ApiResponse.noContent('Gỡ cảm xúc thành công');
  }
}
