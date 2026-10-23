// src/modules/ai-chat/ai-chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/request/send-message.dto';
import { ExecutePendingActionDto } from './dto/request/execute-pending-action.dto';
import { ChatHistoryQueryDto } from './dto/request/chat-history-query.dto';
import { ChatMessageResponseDto } from './dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from './dto/response/pending-action-response.dto';

@ApiTags('AI Chatbot')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('messages')
  @SwaggerDoc({
    summary: 'Gửi tin nhắn đến Trợ lý tài chính AI Mascot',
    description:
      'Gửi tin nhắn văn bản, hoặc văn bản nhận diện từ giọng nói/hóa đơn. AI phân tích ý định, trả về lời thoại Mascot, dữ liệu biểu đồ hoặc thẻ xác nhận thêm giao dịch.',
    responseType: ChatMessageResponseDto,
  })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.aiChatService.sendMessage(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Gửi tin nhắn và nhận phản hồi thành công',
      data,
    });
  }

  @Get('messages')
  @SwaggerDoc({
    summary: 'Lấy lịch sử hội thoại trong ví',
    description: 'Hỗ trợ phân trang theo con trỏ cursor (beforeId) và giới hạn số lượng tin nhắn.',
    responseType: ChatMessageResponseDto,
  })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query() query: ChatHistoryQueryDto,
  ) {
    const data = await this.aiChatService.getHistory(userId, query);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy lịch sử tin nhắn thành công',
      data,
    });
  }

  @Post('pending-actions/:id/execute')
  @SwaggerDoc({
    summary: 'Xác nhận hoặc từ chối hành động giao dịch do AI đề xuất',
    description:
      'Xử lý hành động chờ (CONFIRM hoặc REJECT). Khi CONFIRM, giao dịch thật sẽ được tạo vào sổ cái. Có thể truyền kèm dữ liệu chỉnh sửa.',
    responseType: PendingActionResponseDto,
  })
  async executePendingAction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) actionId: string,
    @Body() dto: ExecutePendingActionDto,
  ) {
    const data = await this.aiChatService.executePendingAction(userId, actionId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: `Đã ${dto.action === 'CONFIRM' ? 'xác nhận tạo' : 'từ chối'} giao dịch thành công`,
      data,
    });
  }

  @Delete('messages')
  @SwaggerDoc({
    summary: 'Xóa toàn bộ lịch sử tin nhắn trong ví',
    description: 'Xóa sạch các tin nhắn hội thoại của người dùng trong ví cụ thể.',
  })
  async clearHistory(
    @CurrentUser('id') userId: string,
    @Query('walletId', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.aiChatService.clearHistory(userId, walletId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: data.message,
      data,
    });
  }
}
