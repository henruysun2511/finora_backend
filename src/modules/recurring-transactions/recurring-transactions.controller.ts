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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import {
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
} from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SwaggerDoc } from '../../common/swagger/swagger-doc'; // Điều chỉnh lại đường dẫn import cho đúng thư mục thực tế

import { CreateRecurringTransactionDto } from './dto/request/create-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from './dto/request/recurring-transaction-query.dto';
import { UpdateRecurringTransactionDto } from './dto/request/update-recurring-transaction.dto';
import { RecurringTransactionDetailResponseDto } from './dto/response/recurring-transaction-detail-response.dto';
import { RecurringTransactionResponseDto } from './dto/response/recurring-transaction-response.dto';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { TransactionResponseDto } from '../transactions/dto/response/transaction-response.dto';

@ApiTags('Recurring Transactions')
@Controller({ path: 'recurring-transactions', version: '1' })
@UseGuards(JwtAuthGuard)
export class RecurringTransactionsController {
  constructor(
    private readonly recurringService: RecurringTransactionsService,
  ) {}

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách lịch giao dịch định kỳ',
    responseType: RecurringTransactionResponseDto,
    isArray: true,
    bearerAuth: true,
    status: HttpStatus.OK,
  })
  async listRules(
    @CurrentUser('id') userId: string,
    @Query() query: RecurringTransactionQueryDto,
  ): Promise<PaginatedResponse<RecurringTransactionResponseDto>> {
    return this.recurringService.listRules(userId, query);
  }

  @Post()
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @SwaggerDoc({
    summary: 'Tạo quy tắc giao dịch định kỳ',
    bodyType: CreateRecurringTransactionDto,
    responseType: RecurringTransactionResponseDto,
    bearerAuth: true,
    status: HttpStatus.CREATED,
  })
  async createRule(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRecurringTransactionDto,
  ): Promise<ApiResponseDto<RecurringTransactionResponseDto>> {
    const data = await this.recurringService.createRule(userId, dto);
    return ApiResponseDto.created(data, 'Tạo quy tắc định kỳ thành công');
  }

  @Post(':id/execute-now')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @SwaggerDoc({
    summary: 'Thực thi quy tắc định kỳ ngay lập tức',
    responseType: TransactionResponseDto,
    bearerAuth: true,
    status: HttpStatus.CREATED,
  })
  async executeNow(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    const data = await this.recurringService.executeNow(userId, id);
    return ApiResponseDto.created(
      data,
      'Thực thi giao dịch định kỳ thành công',
    );
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({
    summary: 'Lấy chi tiết quy tắc định kỳ và lịch sử giao dịch',
    responseType: RecurringTransactionDetailResponseDto,
    bearerAuth: true,
    status: HttpStatus.OK,
  })
  async getRuleDetail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<RecurringTransactionDetailResponseDto>> {
    const data = await this.recurringService.getRuleDetail(userId, id);
    return ApiResponseDto.success(data);
  }

  @Patch(':id') // Đổi từ PUT sang PATCH theo đúng chuẩn RESTful trong bảng quy tắc
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_UPDATE)
  @SwaggerDoc({
    summary: 'Cập nhật một phần quy tắc giao dịch định kỳ',
    bodyType: UpdateRecurringTransactionDto,
    responseType: RecurringTransactionResponseDto,
    bearerAuth: true,
    status: HttpStatus.OK,
  })
  async updateRule(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ): Promise<ApiResponseDto<RecurringTransactionResponseDto>> {
    const data = await this.recurringService.updateRule(userId, id, dto);
    return ApiResponseDto.success(data, 'Cập nhật quy tắc định kỳ thành công');
  }

  @Patch(':id/toggle-pause')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_UPDATE)
  @SwaggerDoc({
    summary: 'Tạm dừng hoặc tiếp tục quy tắc định kỳ',
    bearerAuth: true,
    status: HttpStatus.OK,
  })
  async togglePause(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ isPaused: boolean }>> {
    const data = await this.recurringService.togglePause(userId, id);
    return ApiResponseDto.success(
      data,
      'Cập nhật trạng thái quy tắc định kỳ thành công',
    );
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_DELETE)
  @HttpCode(HttpStatus.OK)
  @SwaggerDoc({
    summary: 'Xóa quy tắc giao dịch định kỳ',
    bearerAuth: true,
    status: HttpStatus.OK,
  })
  async deleteRule(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.recurringService.deleteRule(userId, id);
    return ApiResponseDto.success(null, 'Xóa quy tắc định kỳ thành công');
  }
}
