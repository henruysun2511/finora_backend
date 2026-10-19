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
import { ApiParam, ApiTags } from '@nestjs/swagger';

import { LoansService } from './loans.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

import { LoanQueryDto } from './dto/request/loan-query.dto';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { CreateLoanPaymentDto } from './dto/request/create-loan-payment.dto';

import { LoanResponseDto } from './dto/response/loan-response.dto';
import { LoanDetailResponseDto } from './dto/response/loan-detail-response.dto';
import { LoanSummaryResponseDto } from './dto/response/loan-summary-response.dto';
import { LoanPaymentResponseDto } from './dto/response/loan-payment-response.dto';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // ── [SCRUM-421] API 1: GET /api/v1/loans ──────────────────────────────────
  @Get()
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách khoản vay/nợ (List / Card view)',
    description:
      'Lấy danh sách các khoản vay, cho vay hoặc trả góp trong ví. Hỗ trợ lọc theo loại, trạng thái, tìm kiếm và phân trang.',
    responseType: LoanResponseDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async getLoans(
    @CurrentUser('id') userId: string,
    @Query() query: LoanQueryDto,
  ) {
    return this.loansService.getLoans(userId, query);
  }

  // ── [SCRUM-423] API 2: GET /api/v1/loans/summary ──────────────────────────
  @Get('summary')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @SwaggerDoc({
    summary: 'Thống kê tổng quan sổ nợ',
    description:
      'Tính toán tổng số tiền cần thu về, tổng số tiền phải trả và số khoản nợ quá hạn để hiển thị Widget thống kê ở đỉnh màn hình.',
    responseType: LoanSummaryResponseDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async getSummary(
    @CurrentUser('id') userId: string,
    @Query('walletId') walletId?: string,
  ) {
    const data = await this.loansService.getSummary(userId, walletId);
    return ApiResponse.success(data, 'Lấy thống kê sổ nợ thành công');
  }

  // ── [SCRUM-424] API 3: POST /api/v1/loans ─────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.LOANS_CREATE)
  @SwaggerDoc({
    summary: 'Tạo khoản vay/nợ mới',
    description:
      'Ghi nhận một khoản cho vay (LENT), đi vay (BORROWED) hoặc mua hàng trả góp (INSTALLMENT) mới. Tự động điều chỉnh số dư và sinh giao dịch đồng bộ nếu affectsBalance = true.',
    bodyType: CreateLoanDto,
    responseType: LoanResponseDto,
    status: HttpStatus.CREATED,
    bearerAuth: true,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLoanDto,
  ) {
    const data = await this.loansService.createLoan(userId, dto);
    return ApiResponse.created(data, 'Tạo khoản vay/nợ mới thành công');
  }

  // ── [SCRUM-425] API 4: GET /api/v1/loans/:id ──────────────────────────────
  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay/nợ',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Chi tiết khoản vay',
    description:
      'Lấy thông tin toàn diện về khoản nợ: đối tác, tài khoản, số tiền, hạn trả, tiến độ thanh toán và 5 đợt thanh toán gần nhất.',
    responseType: LoanDetailResponseDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async getById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.loansService.getLoanById(userId, id);
    return ApiResponse.success(data, 'Lấy chi tiết khoản vay/nợ thành công');
  }

  // ── [SCRUM-426] API 5: PUT /api/v1/loans/:id ──────────────────────────────
  @Put(':id')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_UPDATE)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay/nợ',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Cập nhật thông tin khoản vay',
    description:
      'Cập nhật hạn trả nợ, thông tin đối tác, ghi chú hoặc số tiền gốc (khi chưa phát sinh thanh toán).',
    bodyType: UpdateLoanDto,
    responseType: LoanResponseDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    const data = await this.loansService.updateLoan(userId, id, dto);
    return ApiResponse.success(data, 'Cập nhật thông tin khoản nợ thành công');
  }

  // ── [SCRUM-427] API 6: DELETE /api/v1/loans/:id ───────────────────────────
  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_DELETE)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay/nợ cần xóa',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Xóa khoản vay an toàn (chặn nếu đã có thanh toán)',
    description:
      'Xóa bỏ một khoản nợ nhập nhầm. Tự động hoàn tác số dư tài khoản nếu đã trừ/cộng tiền khi tạo. Chặn xóa nếu đã có lịch sử thanh toán.',
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.loansService.deleteLoan(userId, id);
    return ApiResponse.success(null, 'Xóa khoản vay/nợ thành công');
  }

  // ── [SCRUM-428] API 7: POST /api/v1/loans/:id/remind ──────────────────────
  @Post(':id/remind')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay LENT',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Nhắc nợ bạn bè 1-click',
    description:
      'Gửi thông báo Realtime và Socket.IO nhắc nợ đến tài khoản FINORA của người vay. Giới hạn 6 tiếng / lần.',
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async remind(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.loansService.remindLoan(userId, id);
    return ApiResponse.success(result, result.message);
  }

  // ── [SCRUM-429] API 8: DELETE /api/v1/loans/:id/counterparty ──────────────
  @Delete(':id/counterparty')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_UPDATE)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản nợ bị tag nhầm',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Gỡ liên kết bạn bè khỏi khoản nợ',
    description:
      'Cho phép người được tag tự gỡ bỏ liên kết tài khoản của chính mình khỏi khoản nợ.',
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async removeCounterparty(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.loansService.removeCounterparty(userId, id);
    return ApiResponse.success(result, result.message);
  }

  // ── [SCRUM-430] API 9: POST /api/v1/loans/:id/payments ────────────────────
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.LOANS_UPDATE)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay/nợ cần thanh toán',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Ghi nhận đợt trả nợ / thu hồi nợ (Dual-Record)',
    description:
      'Ghi nhận đợt thanh toán nợ, giảm trừ số nợ còn lại. Tự động chuyển SETTLED khi trả đủ 100%, đồng thời điều chỉnh số dư tài khoản và sinh giao dịch Thu/Chi tương ứng.',
    bodyType: CreateLoanPaymentDto,
    responseType: LoanPaymentResponseDto,
    status: HttpStatus.CREATED,
    bearerAuth: true,
  })
  async recordPayment(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLoanPaymentDto,
  ) {
    const data = await this.loansService.recordPayment(userId, id, dto);
    return ApiResponse.created(data, 'Ghi nhận thanh toán thành công');
  }

  // ── [SCRUM-431] API 10: GET /api/v1/loans/:id/payments ────────────────────
  @Get(':id/payments')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @ApiParam({
    name: 'id',
    description: 'UUID của khoản vay/nợ',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  @SwaggerDoc({
    summary: 'Lấy lịch sử thanh toán của khoản nợ',
    description:
      'Lấy danh sách các đợt trả nợ đã diễn ra của khoản vay cụ thể, sắp xếp từ mới nhất đến cũ nhất.',
    responseType: LoanPaymentResponseDto,
    status: HttpStatus.OK,
    bearerAuth: true,
  })
  async getPayments(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.loansService.getPayments(userId, id);
    return ApiResponse.success(data, 'Lấy lịch sử thanh toán thành công');
  }
}
