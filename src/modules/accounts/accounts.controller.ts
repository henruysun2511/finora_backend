// src/modules/accounts/accounts.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/request/create-account.dto';
import { UpdateAccountDto } from './dto/request/update-account.dto';
import { AccountQueryDto } from './dto/request/account-query.dto';
import { AdjustBalanceDto } from './dto/request/adjust-balance.dto';
import { AccountDetailDto, PaginatedAccountsDto } from './dto/response/account-response.dto';
import { AccountBalanceResponseDto } from './dto/response/account-balance-response.dto';
import { BalanceAdjustmentResponseDto } from './dto/response/balance-adjustment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Chống tạo trùng khi gửi lặp',
  })
  @SwaggerDoc({
    summary: 'Tạo tài khoản tài chính',
    description:
      'Tạo tài khoản (tiền mặt, ngân hàng, ví điện tử...) trong một Wallet mà người dùng có quyền ghi.',
    bodyType: CreateAccountDto,
    responseType: AccountDetailDto,
    status: 201,
    bearerAuth: true,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAccountDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.accountsService.createAccount(userId, dto, idempotencyKey);
    return ApiResponse.created(data, 'Tạo tài khoản thành công');
  }

  @Get()
  @SwaggerDoc({
    summary: 'Lấy danh sách tài khoản',
    description:
      'Danh sách tài khoản thuộc các Wallet người dùng có quyền truy cập, có phân trang và bộ lọc. Mặc định chỉ trả tài khoản đang hoạt động.',
    responseType: PaginatedAccountsDto,
    status: 200,
    bearerAuth: true,
  })
  async findAll(@CurrentUser('id') userId: string, @Query() query: AccountQueryDto) {
    const data = await this.accountsService.listAccounts(userId, query);
    return ApiResponse.success(data, 'Lấy danh sách tài khoản thành công');
  }

  @Get(':id')
  @SwaggerDoc({
    summary: 'Lấy chi tiết tài khoản',
    description: 'Xem chi tiết một tài khoản (kể cả đã lưu trữ) nếu có quyền truy cập.',
    responseType: AccountDetailDto,
    status: 200,
    bearerAuth: true,
  })
  async findOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.accountsService.getAccount(userId, id);
    return ApiResponse.success(data, 'Lấy chi tiết tài khoản thành công');
  }

  @Patch(':id')
  @SwaggerDoc({
    summary: 'Cập nhật thông tin tài khoản',
    description:
      'Cập nhật tên, loại, tiền tệ, biểu tượng, màu, 4 số cuối. Không cho phép cập nhật số dư, ví hoặc chủ sở hữu.',
    bodyType: UpdateAccountDto,
    responseType: AccountDetailDto,
    status: 200,
    bearerAuth: true,
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const data = await this.accountsService.updateAccount(userId, id, dto);
    return ApiResponse.success(data, 'Cập nhật tài khoản thành công');
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: 'Xóa mềm tài khoản',
    description:
      'Xóa mềm tài khoản chưa phát sinh giao dịch. Tài khoản đã có giao dịch bị chặn xóa, hãy dùng lưu trữ.',
    status: 200,
    bearerAuth: true,
  })
  async remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.accountsService.deleteAccount(userId, id);
    return ApiResponse.success(null, 'Xóa tài khoản thành công');
  }

  @Post(':id/archive')
  @HttpCode(200)
  @SwaggerDoc({
    summary: 'Lưu trữ tài khoản',
    description:
      'Chuyển tài khoản sang trạng thái lưu trữ, không mất số dư hoặc lịch sử. Gọi lặp trả về nguyên trạng.',
    responseType: AccountDetailDto,
    status: 200,
    bearerAuth: true,
  })
  async archive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.accountsService.archiveAccount(userId, id);
    return ApiResponse.success(data, 'Lưu trữ tài khoản thành công');
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  @SwaggerDoc({
    summary: 'Bỏ lưu trữ tài khoản',
    description: 'Khôi phục tài khoản về trạng thái hoạt động.',
    responseType: AccountDetailDto,
    status: 200,
    bearerAuth: true,
  })
  async unarchive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.accountsService.unarchiveAccount(userId, id);
    return ApiResponse.success(data, 'Bỏ lưu trữ tài khoản thành công');
  }

  @Get(':id/balance')
  @SwaggerDoc({
    summary: 'Lấy số dư tài khoản',
    description:
      'Trả số dư hiện tại theo loại tiền tệ của tài khoản. API chỉ đọc, không quy đổi tiền tệ.',
    responseType: AccountBalanceResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getBalance(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.accountsService.getBalance(userId, id);
    return ApiResponse.success(data, 'Lấy số dư tài khoản thành công');
  }

  @Post(':id/balance-adjustments')
  @HttpCode(200)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Khóa chống xử lý lặp (bắt buộc)',
  })
  @SwaggerDoc({
    summary: 'Điều chỉnh số dư tài khoản',
    description:
      'Ghi nhận điều chỉnh tăng/giảm số dư kèm lý do. Cập nhật số dư và lịch sử trong cùng một transaction. Gửi lại cùng Idempotency-Key sẽ không ghi lần 2.',
    bodyType: AdjustBalanceDto,
    responseType: BalanceAdjustmentResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async adjustBalance(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBalanceDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.accountsService.adjustBalance(userId, id, dto, idempotencyKey);
    return ApiResponse.success(data, 'Điều chỉnh số dư thành công');
  }
}