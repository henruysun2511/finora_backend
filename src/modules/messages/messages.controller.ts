import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
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
    description:
      'Lấy lịch sử tin nhắn phân trang giữa user hiện tại và friendId. Có thể dùng before để lấy tin cũ hơn một tin nhắn mốc.',
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
    const limit = query.limit ?? 30;
    const result = await this.messagesService.getHistory(userId, friendId, query);
    return PaginatedResponse.of(
      result.items,
      result.total,
      query.before ? 1 : page,
      limit,
    );
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
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_UPDATE)
  @SwaggerDoc({
    summary: '4. Đánh dấu cuộc trò chuyện đã đọc',
    description: 'Đánh dấu tất cả tin nhắn từ friendId gửi cho user hiện tại thành đã đọc.',
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  @ApiParam({ name: 'friendId', description: 'UUID của người bạn' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ): Promise<{ success: true; markedCount: number }> {
    const data = await this.messagesService.markAsRead(userId, friendId);
    return { success: true, markedCount: data.markedCount };
  }

  // ── API 5: DELETE /api/v1/messages/:id ────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_DELETE)
  @SwaggerDoc({
    summary: '5. Thu hồi tin nhắn',
    description: 'Thu hồi (xóa mềm) tin nhắn trong vòng 15 phút kể từ lúc gửi. Chỉ người gửi mới có quyền thu hồi.',
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của tin nhắn cần thu hồi' })
  async recallMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; message: string }> {
    await this.messagesService.recallMessage(userId, id);
    return { success: true, message: 'Đã thu hồi tin nhắn' };
  }

  // ── API 6: POST /api/v1/messages/:id/reactions ────────────────────────────

  @Post(':id/reactions')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.MESSAGES_CREATE)
  @SwaggerDoc({
    summary: '6. Thả cảm xúc vào tin nhắn',
    description: 'Thả hoặc đổi emoji cảm xúc trên một tin nhắn. Mỗi user chỉ có tối đa 1 reaction trên 1 tin nhắn.',
    bodyType: AddMessageReactionDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của tin nhắn' })
  async addReaction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageReactionDto,
  ): Promise<{ success: true; emoji: string }> {
    return this.messagesService.addReaction(userId, id, dto);
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
