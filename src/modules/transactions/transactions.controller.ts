import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/request/create-transaction.dto';
import { UpdateTransactionDto } from './dto/request/update-transaction.dto';
import { TransactionQueryDto } from './dto/request/transaction-query.dto';
import { DailyTransactionGridQueryDto } from './dto/request/daily-grid-query.dto';
import { TransactionResponseDto } from './dto/response/transaction-response.dto';
import { ReceiptResponseDto } from './dto/response/receipt-response.dto';
import { DailyTransactionGridResponseDto } from './dto/response/daily-transaction-grid-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_CREATE)
  @ApiOperation({
    summary: 'Tạo giao dịch thu nhập hoặc chi tiêu',
    description:
      'Ghi nhận một giao dịch thu tiền (INCOME) hoặc chi tiền (EXPENSE). Tự động cập nhật số dư tài khoản theo cơ chế Pessimistic Lock, đảm bảo tính toàn vẹn và không âm tiền ngoài hạn mức.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Tạo giao dịch thành công',
    type: TransactionResponseDto,
  })
  async createTransaction(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<ApiResponse<TransactionResponseDto>> {
    const data = await this.transactionsService.createTransaction(userId, dto);
    return ApiResponse.created(data, 'Tạo giao dịch thành công');
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @ApiOperation({
    summary: 'Lấy danh sách giao dịch (phân trang & bộ lọc)',
    description:
      'Lấy danh sách giao dịch thuộc các tài khoản mà người dùng có quyền truy cập, hỗ trợ lọc theo tài khoản, danh mục, loại thu/chi và khoảng thời gian.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Danh sách giao dịch phân trang',
    type: [TransactionResponseDto],
  })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<PaginatedResponse<TransactionResponseDto>> {
    return this.transactionsService.getTransactions(userId, query);
  }

  @Get('daily-grid')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @ApiOperation({
    summary: 'Lấy danh sách giao dịch dạng lưới theo ngày',
    description:
      'Lấy danh sách giao dịch được gom nhóm theo từng ngày phát sinh. Hỗ trợ lọc theo tháng/năm, khoảng ngày tùy chọn, lọc theo ví, tài khoản, danh mục hoặc loại thu/chi. Tính toán tổng thu, tổng chi và số dư ròng cho từng ngày và cả kỳ.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Danh sách giao dịch dạng lưới theo ngày kèm thống kê',
    type: DailyTransactionGridResponseDto,
  })
  async getDailyGrid(
    @CurrentUser('id') userId: string,
    @Query() query: DailyTransactionGridQueryDto,
  ): Promise<ApiResponse<DailyTransactionGridResponseDto>> {
    const data = await this.transactionsService.getDailyGrid(userId, query);
    return ApiResponse.success(data, 'Lấy danh sách giao dịch dạng lưới thành công');
  }

  @Get('receipts/:id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @ApiOperation({
    summary: 'Lấy chi tiết hóa đơn OCR đã quét',
    description: 'Xem thông tin chi tiết hóa đơn (ảnh, tên cửa hàng, tổng tiền, thuế, tip, raw OCR) theo ID.',
  })
  @ApiParam({ name: 'id', description: 'UUID của hóa đơn' })
  @SwaggerResponse({
    status: 200,
    description: 'Chi tiết hóa đơn',
    type: ReceiptResponseDto,
  })
  async getReceiptById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ReceiptResponseDto>> {
    const data = await this.transactionsService.getReceiptById(userId, id);
    return ApiResponse.success(data);
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @ApiOperation({
    summary: 'Lấy chi tiết giao dịch',
    description: 'Xem thông tin chi tiết một giao dịch cụ thể theo ID.',
  })
  @ApiParam({ name: 'id', description: 'UUID của giao dịch' })
  @SwaggerResponse({
    status: 200,
    description: 'Chi tiết giao dịch',
    type: TransactionResponseDto,
  })
  async getTransactionById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<TransactionResponseDto>> {
    const data = await this.transactionsService.getTransactionById(userId, id);
    return ApiResponse.success(data);
  }

  @Put(':id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_UPDATE)
  @ApiOperation({
    summary: 'Cập nhật giao dịch',
    description:
      'Chỉnh sửa thông tin giao dịch. Nếu thay đổi số tiền, loại thu/chi hoặc tài khoản, hệ thống tự động tính toán lại và điều chỉnh số dư tài khoản theo cơ chế Pessimistic Lock chống Deadlock.',
  })
  @ApiParam({ name: 'id', description: 'UUID của giao dịch' })
  @SwaggerResponse({
    status: 200,
    description: 'Cập nhật giao dịch thành công',
    type: TransactionResponseDto,
  })
  async updateTransaction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<ApiResponse<TransactionResponseDto>> {
    const data = await this.transactionsService.updateTransaction(userId, id, dto);
    return ApiResponse.success(data, 'Cập nhật giao dịch thành công');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_DELETE)
  @ApiOperation({
    summary: 'Xóa giao dịch (Soft Delete)',
    description:
      'Xóa mềm giao dịch và hoàn tác số dư tài khoản tương ứng: cộng lại tiền nếu xóa khoản chi (EXPENSE) hoặc thu hồi tiền nếu xóa khoản thu (INCOME).',
  })
  @ApiParam({ name: 'id', description: 'UUID của giao dịch' })
  @SwaggerResponse({
    status: 200,
    description: 'Xóa giao dịch thành công',
  })
  async deleteTransaction(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.transactionsService.deleteTransaction(userId, id);
    return ApiResponse.success(null, 'Xóa giao dịch thành công');
  }
}

