import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { DashboardQueryDto } from './dto/request/dashboard-query.dto';
import { CashFlowQueryDto } from './dto/request/cash-flow-query.dto';
import { CategoryBreakdownQueryDto } from './dto/request/category-breakdown-query.dto';
import { DashboardMonthQueryDto } from './dto/request/dashboard-month-query.dto';
import { OverviewDashboardResponseDto } from './dto/response/overview-dashboard-response.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({
    summary: 'Dashboard 1: Tổng quan tài sản ròng & dòng tiền',
    description: 'Cung cấp bức tranh toàn cảnh sức khỏe tài chính, net worth, dòng tiền tháng và cảnh báo khẩn cấp.',
    responseType: OverviewDashboardResponseDto,
    status: 200, 
    bearerAuth: true,
  })
  async getOverview(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    const data = await this.dashboardService.getExecutiveOverview(userId, query);
    return ApiResponse.success(data, 'Lấy tổng quan tài chính thành công');
  }

  @Get('cash-flow')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({ summary: 'Dashboard 2: Dòng tiền & xu hướng chi tiêu', bearerAuth: true })
  async getCashFlow(@CurrentUser('id') userId: string, @Query() query: CashFlowQueryDto) {
    return ApiResponse.success(
      await this.dashboardService.getCashFlow(userId, query),
      'Lấy dữ liệu xu hướng dòng tiền thành công',
    );
  }

  @Get('category-breakdown')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({ summary: 'Dashboard 3: Cơ cấu thu chi theo danh mục', bearerAuth: true })
  async getCategoryBreakdown(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryBreakdownQueryDto,
  ) {
    return ApiResponse.success(
      await this.dashboardService.getCategoryBreakdown(userId, query),
      'Lấy cơ cấu danh mục thành công',
    );
  }

  @Get('budget-health')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_READ)
  @SwaggerDoc({ summary: 'Dashboard 4: Sức khỏe ngân sách', bearerAuth: true })
  async getBudgetHealth(@CurrentUser('id') userId: string, @Query() query: DashboardMonthQueryDto) {
    return ApiResponse.success(
      await this.dashboardService.getBudgetHealth(userId, query),
      'Lấy dữ liệu sức khỏe ngân sách thành công',
    );
  }

  @Get('debts')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @SwaggerDoc({ summary: 'Dashboard 5: Sổ nợ & nghĩa vụ tài chính', bearerAuth: true })
  async getDebts(@CurrentUser('id') userId: string, @Query() query: DashboardQueryDto) {
    return ApiResponse.success(
      await this.dashboardService.getDebts(userId, query),
      'Lấy dữ liệu sổ nợ thành công',
    );
  }

  @Get('calendar')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({ summary: 'Dashboard 6: Lịch tài chính & hóa đơn sắp tới', bearerAuth: true })
  async getCalendar(@CurrentUser('id') userId: string, @Query() query: DashboardMonthQueryDto) {
    return ApiResponse.success(
      await this.dashboardService.getCalendar(userId, query),
      'Lấy dữ liệu lịch tài chính thành công',
    );
  }

  @Get('shared-wallet/:walletId')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @SwaggerDoc({ summary: 'Dashboard 7: Thống kê ví chung', bearerAuth: true })
  async getSharedWallet(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    return ApiResponse.success(
      await this.dashboardService.getSharedWalletDashboard(userId, walletId),
      'Lấy thống kê ví chung thành công',
    );
  }
}

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('operations')
  @Permissions(SYSTEM_PERMISSIONS.SYSTEM_AUDIT_VIEW)
  @SwaggerDoc({ summary: 'Dashboard 8: Vận hành nền tảng', bearerAuth: true })
  async getOperations() {
    return ApiResponse.success(
      await this.dashboardService.getOperationsDashboard(),
      'Lấy dữ liệu vận hành nền tảng thành công',
    );
  }
}