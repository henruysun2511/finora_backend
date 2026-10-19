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
import { SplitExpensesService } from '../split-expenses.service';
import { RespondSplitDto } from '../dto/request/respond-split.dto';
import { RebalanceSplitDto } from '../dto/request/rebalance-split.dto';
import { SplitQueryDto } from '../dto/request/split-query.dto';
import { SplitResponseDto } from '../dto/response/split-response.dto';
import { SplitParticipantResponseDto } from '../dto/response/split-participant-response.dto';
import { MySplitsSummaryResponseDto } from '../dto/response/my-splits-summary-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../../common/constants/permission.constant';
import { ApiResponse, PaginatedResponse } from '../../../common/response/api-response';

@ApiTags('Split Expenses')
@ApiBearerAuth('access-token')
@Controller('splits')
@UseGuards(JwtAuthGuard)
export class SplitsController {
  constructor(private readonly splitExpensesService: SplitExpensesService) {}

  @Get('me')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @ApiOperation({
    summary: 'Lấy danh sách các phiên chia tiền của tôi',
    description:
      'Hỗ trợ phân trang và lọc theo vai trò (tất cả, người tạo, người tham gia) và trạng thái phiên chia.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Lấy danh sách phiên chia tiền thành công',
    type: SplitResponseDto,
    isArray: true,
  })
  async getMySplits(
    @CurrentUser('id') userId: string,
    @Query() query: SplitQueryDto,
  ): Promise<PaginatedResponse<SplitResponseDto>> {
    return this.splitExpensesService.getMySplits(userId, query);
  }

  @Get('summary')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @ApiOperation({
    summary: 'Thống kê tổng quan các phiên chia tiền của tôi',
    description:
      'Trả về số yêu cầu đang chờ phản hồi, tổng tiền bạn bè đang nợ mình và tổng tiền mình đang nợ bạn bè qua các phiên đã chốt.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Lấy thống kê thành công',
    type: MySplitsSummaryResponseDto,
  })
  async getSummary(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<MySplitsSummaryResponseDto>> {
    const data = await this.splitExpensesService.getMySplitsSummary(userId);
    return ApiResponse.success(data, 'Lấy thống kê chia tiền thành công');
  }

  @Get(':splitId')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @ApiOperation({
    summary: 'Lấy chi tiết phiên chia tiền theo ID',
    description:
      'Chỉ chủ phiên hoặc những người tham gia trong phiên mới có quyền xem chi tiết.',
  })
  @ApiParam({
    name: 'splitId',
    description: 'UUID của phiên chia tiền',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Lấy chi tiết thành công',
    type: SplitResponseDto,
  })
  async getSplitById(
    @CurrentUser('id') userId: string,
    @Param('splitId', ParseUUIDPipe) splitId: string,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.getSplitById(userId, splitId);
    return ApiResponse.success(data, 'Lấy chi tiết phiên chia tiền thành công');
  }

  @Post(':splitId/respond')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_UPDATE)
  @ApiOperation({
    summary: 'Phản hồi yêu cầu chia tiền (Đồng ý, Từ chối hoặc Đề xuất lại)',
    description:
      'Người tham gia phản hồi yêu cầu. Nếu đề xuất lại (propose), bắt buộc nhập số tiền mới proposedAmount. Nếu tất cả bạn bè đều đã đồng ý, trạng thái phiên chuyển sang ALL_ACCEPTED.',
  })
  @ApiParam({
    name: 'splitId',
    description: 'UUID của phiên chia tiền',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Phản hồi yêu cầu chia tiền thành công',
    type: SplitParticipantResponseDto,
  })
  async respondSplit(
    @CurrentUser('id') userId: string,
    @Param('splitId', ParseUUIDPipe) splitId: string,
    @Body() dto: RespondSplitDto,
  ): Promise<ApiResponse<SplitParticipantResponseDto>> {
    const data = await this.splitExpensesService.respondSplit(
      userId,
      splitId,
      dto,
    );
    return ApiResponse.success(data, 'Phản hồi yêu cầu chia tiền thành công');
  }

  @Put(':splitId/rebalance')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_UPDATE)
  @ApiOperation({
    summary: 'Chủ phiên điều chỉnh lại số tiền phân bổ cho bạn bè',
    description:
      'Chủ phiên gán lại mức chia tiền cho từng người bạn sau khi trao đổi. Trạng thái phản hồi của bạn bè được reset về PENDING để xác nhận lại.',
  })
  @ApiParam({
    name: 'splitId',
    description: 'UUID của phiên chia tiền',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Điều chỉnh số tiền thành công',
    type: SplitResponseDto,
  })
  async rebalanceSplit(
    @CurrentUser('id') userId: string,
    @Param('splitId', ParseUUIDPipe) splitId: string,
    @Body() dto: RebalanceSplitDto,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.rebalanceSplit(
      userId,
      splitId,
      dto,
    );
    return ApiResponse.success(data, 'Điều chỉnh số tiền phân bổ thành công');
  }

  @Post(':splitId/confirm')
  @HttpCode(HttpStatus.OK)
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_UPDATE)
  @ApiOperation({
    summary: 'Chốt phiên chia tiền (Tự động tạo khoản nợ phải thu)',
    description:
      'Chỉ được chốt khi 100% bạn bè đã đồng ý (ALL_ACCEPTED). Sau khi chốt, phiên chuyển sang CONFIRMED và tự động tạo các khoản nợ phải thu (LENT) tương ứng trong module Loans.',
  })
  @ApiParam({
    name: 'splitId',
    description: 'UUID của phiên chia tiền',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Chốt phiên chia tiền thành công',
    type: SplitResponseDto,
  })
  async confirmSplit(
    @CurrentUser('id') userId: string,
    @Param('splitId', ParseUUIDPipe) splitId: string,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.confirmSplit(userId, splitId);
    return ApiResponse.success(data, 'Chốt phiên chia tiền thành công');
  }

  @Delete(':splitId')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_DELETE)
  @ApiOperation({
    summary: 'Hủy phiên chia tiền',
    description:
      'Chủ phiên hủy phiên chia tiền khi chưa chốt. Phiên chuyển sang CANCELLED và gửi thông báo tới các bạn bè.',
  })
  @ApiParam({
    name: 'splitId',
    description: 'UUID của phiên chia tiền',
    type: 'string',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Hủy phiên chia tiền thành công',
    type: SplitResponseDto,
  })
  async cancelSplit(
    @CurrentUser('id') userId: string,
    @Param('splitId', ParseUUIDPipe) splitId: string,
  ): Promise<ApiResponse<SplitResponseDto>> {
    const data = await this.splitExpensesService.cancelSplit(userId, splitId);
    return ApiResponse.success(data, 'Hủy phiên chia tiền thành công');
  }
}
