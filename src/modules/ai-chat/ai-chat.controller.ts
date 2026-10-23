// src/modules/ai-chat/ai-chat.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/response/api-response';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiChatService } from './ai-chat.service';
import { AI_CHAT_CONFIG } from './constants';
import { ChatHistoryQueryDto } from './dto/request/chat-history-query.dto';
import {
  ExecutePendingActionDto,
  PendingActionDecision,
} from './dto/request/execute-pending-action.dto';
import { SendMediaMessageDto } from './dto/request/send-media-message.dto';
import { SendMessageDto } from './dto/request/send-message.dto';
import { ChatMessageResponseDto } from './dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from './dto/response/pending-action-response.dto';
import { UploadedMedia } from './interfaces/ai-chat.types';

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
      'Gửi tin nhắn văn bản. AI phân loại ý định rồi trả về: thẻ xác nhận giao dịch (add_transaction), dữ liệu biểu đồ/thống kê (query), hoặc lời thoại theo phong cách Mascot (chitchat / ngoài phạm vi / cần làm rõ). Khi người dùng chọn một gợi ý làm rõ, gửi lại kèm intentOverride.',
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

  @Post('messages/media')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['walletId', 'file'],
      properties: {
        walletId: { type: 'string', format: 'uuid' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Âm thanh (giọng nói) hoặc ảnh hóa đơn',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: Math.max(
          AI_CHAT_CONFIG.MAX_AUDIO_BYTES,
          AI_CHAT_CONFIG.MAX_IMAGE_BYTES,
        ),
        files: 1,
      },
    }),
  )
  @SwaggerDoc({
    summary: 'Gửi giọng nói hoặc ảnh hóa đơn cho AI',
    description:
      'Giọng nói được chuyển thành văn bản (PhoWhisper) rồi xử lý như tin nhắn thường. Ảnh hóa đơn được đọc bằng OCR (VietOCR) để trích tổng tiền/tên cửa hàng và tạo thẻ xác nhận giao dịch. Không nhận diện/đọc được sẽ trả 422 kèm requireManualInput.',
    responseType: ChatMessageResponseDto,
  })
  async sendMediaMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMediaMessageDto,
    @UploadedFile() file: UploadedMedia | undefined,
  ) {
    const data = await this.aiChatService.sendMediaMessage(userId, dto, file);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Xử lý tệp và nhận phản hồi thành công',
      data,
    });
  }

  @Get('messages')
  @SwaggerDoc({
    summary: 'Lấy lịch sử hội thoại trong ví',
    description:
      'Mới nhất trước. Phân trang theo con trỏ beforeId. Tin CONFIRMATION_PROMPT kèm trạng thái hiện tại của hành động chờ.',
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

  @Get('pending-actions/:id')
  @SwaggerDoc({
    summary: 'Xem trạng thái một hành động chờ xác nhận',
    description: 'Trạng thái PENDING đã quá hạn được trả về là EXPIRED.',
    responseType: PendingActionResponseDto,
  })
  async getPendingAction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) actionId: string,
  ) {
    const data = await this.aiChatService.getPendingAction(userId, actionId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy hành động chờ thành công',
      data,
    });
  }

  @Post('pending-actions/:id/execute')
  @SwaggerDoc({
    summary: 'Xác nhận hoặc từ chối giao dịch do AI đề xuất',
    description:
      'CONFIRM: kiểm tra lại dữ liệu (kèm editedData nếu người dùng sửa/bổ sung) rồi tạo giao dịch thật; kết quả kèm tin nhắn của Mascot (và lời khuyên nếu khớp rule). REJECT: hủy. Lỗi dữ liệu (400) không làm mất hành động chờ — người dùng có thể sửa và gửi lại.',
    responseType: PendingActionResponseDto,
  })
  async executePendingAction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) actionId: string,
    @Body() dto: ExecutePendingActionDto,
  ) {
    const data = await this.aiChatService.executePendingAction(
      userId,
      actionId,
      dto,
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: `Đã ${dto.action === PendingActionDecision.CONFIRM ? 'xác nhận tạo' : 'từ chối'} giao dịch thành công`,
      data,
    });
  }

  @Delete('messages')
  @SwaggerDoc({
    summary: 'Xóa toàn bộ lịch sử tin nhắn trong ví',
    description:
      'Xóa sạch tin nhắn của người dùng trong ví và hủy các hành động chờ xác nhận còn hiệu lực.',
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
