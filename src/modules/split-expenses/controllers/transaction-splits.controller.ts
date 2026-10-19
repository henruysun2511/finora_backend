import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SplitExpensesService } from '../split-expenses.service';
import { CreateSplitDto } from '../dto/request/create-split.dto';
import { SplitResponseDto } from '../dto/response/split-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../../common/constants/permission.constant';
import { ApiResponse } from '../../../common/response/api-response';

@ApiTags('Split Expenses')
@ApiBearerAuth('access-token')
@Controller('transactions/:transactionId/splits')
@UseGuards(JwtAuthGuard)
export class TransactionSplitsController {
  constructor(private readonly splitExpensesService: SplitExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_CREATE)
  @ApiOperation({
    summary: 'Tạo phiên chia tiền cho giao dịch chi tiêu',
    description:
      'Chủ giao dịch chi tiêu mở phiên chia tiền với danh sách bạn bè (EQUAL hoặc CUSTOM). Giao dịch gốc không thay đổi số tiền, hệ thống gửi thông báo yêu cầu xác nhận tới từng bạn bè.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'UUID của giao dịch chi tiêu gốc',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo phiên chia tiền thành công',
    type: SplitResponseDto,
  })
  async createSplit(
    @CurrentUser('id') userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: CreateSplitDto,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.createSplit(
      userId,
      transactionId,
      dto,
    );
    return ApiResponse.created(data, 'Tạo phiên chia tiền thành công');
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @ApiOperation({
    summary: 'Lấy thông tin phiên chia tiền theo giao dịch',
    description:
      'Chủ phiên hoặc người tham gia xem chi tiết phiên chia tiền của giao dịch này.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'UUID của giao dịch chi tiêu gốc',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Lấy thông tin phiên chia tiền thành công',
    type: SplitResponseDto,
  })
  async getSplitByTransaction(
    @CurrentUser('id') userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.getSplitByTransactionId(
      userId,
      transactionId,
    );
    return ApiResponse.success(data, 'Lấy thông tin phiên chia tiền thành công');
  }
}
