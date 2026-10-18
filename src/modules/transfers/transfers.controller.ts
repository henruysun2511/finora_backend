// src/modules/transfers/transfers.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/request/create-transfer.dto';
import { ConvertCurrencyDto } from './dto/request/convert-currency.dto';
import { TransferQueryDto } from './dto/request/transfer-query.dto';
import { TransferResponseDto } from './dto/response/transfer-response.dto';
import { ConvertPreviewResponseDto } from './dto/response/convert-preview-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { ApiResponse, PaginatedResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transfers')
@ApiBearerAuth('access-token')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.TRANSFERS_CREATE)
  @ApiOperation({
    summary: 'Tạo giao dịch chuyển tiền giữa 2 tài khoản',
    description:
      'Chuyển tiền giữa 2 tài khoản. Nếu 2 tài khoản khác loại tiền tệ, hệ thống sẽ tự động gọi API lấy tỷ giá hiện tại, quy đổi và lưu tỷ giá đã áp dụng vào giao dịch.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Tạo giao dịch chuyển tiền thành công',
    type: TransferResponseDto,
  })
  async transferMoney(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto,
  ): Promise<ApiResponse<TransferResponseDto>> {
    const data = await this.transfersService.createTransfer(userId, dto);
    return ApiResponse.created(data, 'Chuyển tiền thành công');
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.TRANSFERS_READ)
  @ApiOperation({
    summary: 'Preview tính toán quy đổi tiền tệ và tỷ giá trước khi chuyển',
    description:
      'Nhập tài khoản nguồn, đích và số tiền để xem tỷ giá áp dụng và số tiền dự kiến nhận được.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Quy đổi tiền tệ thành công',
    type: ConvertPreviewResponseDto,
  })
  async convertCurrency(
    @CurrentUser('id') userId: string,
    @Body() dto: ConvertCurrencyDto,
  ): Promise<ApiResponse<ConvertPreviewResponseDto>> {
    const data = await this.transfersService.convertPreview(userId, dto);
    return ApiResponse.success(data, 'Tính toán tỷ giá quy đổi thành công');
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.TRANSFERS_READ)
  @ApiOperation({
    summary: 'Lấy lịch sử các giao dịch chuyển tiền có phân trang',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Lấy danh sách giao dịch chuyển tiền thành công',
    type: TransferResponseDto,
    isArray: true,
  })
  async getTransferList(
    @CurrentUser('id') userId: string,
    @Query() query: TransferQueryDto,
  ): Promise<PaginatedResponse<TransferResponseDto>> {
    return this.transfersService.getTransfers(userId, query);
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.TRANSFERS_READ)
  @ApiOperation({
    summary: 'Xem chi tiết một giao dịch chuyển tiền',
  })
  @ApiParam({ name: 'id', example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  @SwaggerResponse({
    status: 200,
    description: 'Lấy chi tiết giao dịch thành công',
    type: TransferResponseDto,
  })
  async getTransferDetail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<TransferResponseDto>> {
    const data = await this.transfersService.getTransferById(userId, id);
    return ApiResponse.success(data, 'Lấy chi tiết giao dịch thành công');
  }
}
