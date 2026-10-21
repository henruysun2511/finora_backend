import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboards.service';
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
import { CashFlowResponseDto } from './dto/response/cash-flow-response.dto';
import { CategoryBreakdownResponseDto } from './dto/response/category-breakdown-response.dto';
import { BudgetHealthResponseDto } from './dto/response/budget-health-response.dto';
import { DebtsDashboardResponseDto } from './dto/response/debts-dashboard-response.dto';
import { CalendarDashboardResponseDto } from './dto/response/calendar-dashboard-response.dto';
import { SharedWalletDashboardResponseDto } from './dto/response/shared-wallet-dashboard-response.dto';
import { OperationsDashboardResponseDto } from './dto/response/operations-dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
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
  @SwaggerDoc({
    summary: 'Dashboard 2: Dòng tiền & xu hướng chi tiêu',
    description: 'Phân tích dòng tiền theo chu kỳ, heatmap thứ trong tuần và phân bổ theo khung giờ.',
    responseType: CashFlowResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getCashFlow(
    @CurrentUser('id') userId: string,
    @Query() query: CashFlowQueryDto,
  ) {
    const data = await this.dashboardService.getCashFlow(userId, query);
    return ApiResponse.success(data, 'Lấy dữ liệu xu hướng dòng tiền thành công');
  }

  @Get('category-breakdown')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({
    summary: 'Dashboard 3: Cơ cấu thu chi theo danh mục',
    description: 'Phân tích cơ cấu danh mục cha-con, quy tắc 50/30/20 và top khoản chi tiêu.',
    responseType: CategoryBreakdownResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getCategoryBreakdown(
    @CurrentUser('id') userId: string,
    @Query() query: CategoryBreakdownQueryDto,
  ) {
    const data = await this.dashboardService.getCategoryBreakdown(userId, query);
    return ApiResponse.success(data, 'Lấy cơ cấu danh mục thành công');
  }

  @Get('budget-health')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_READ)
  @SwaggerDoc({
    summary: 'Dashboard 4: Sức khỏe ngân sách & Burn-rate',
    description: 'Giám sát tốc độ tiêu tiền hàng ngày, dự báo ngày cạn ngân sách và đèn cảnh báo theo danh mục.',
    responseType: BudgetHealthResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getBudgetHealth(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardMonthQueryDto,
  ) {
    const data = await this.dashboardService.getBudgetHealth(userId, query);
    return ApiResponse.success(data, 'Lấy dữ liệu sức khỏe ngân sách thành công');
  }

  @Get('debts')
  @Permissions(SYSTEM_PERMISSIONS.LOANS_READ)
  @SwaggerDoc({
    summary: 'Dashboard 5: Sổ nợ & nghĩa vụ tài chính',
    description: 'Theo dõi tổng phải thu/phải trả, vị thế nợ ròng, cảnh báo quá hạn và tiến độ các khoản trả góp.',
    responseType: DebtsDashboardResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getDebts(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    const data = await this.dashboardService.getDebts(userId, query);
    return ApiResponse.success(data, 'Lấy dữ liệu sổ nợ thành công');
  }

  @Get('calendar')
  @Permissions(SYSTEM_PERMISSIONS.TRANSACTIONS_READ)
  @SwaggerDoc({
    summary: 'Dashboard 6: Lịch tài chính & hóa đơn định kỳ',
    description: 'Bản đồ chi tiêu theo lịch ngày, cảnh báo đột biến và dự phóng hóa đơn 30 ngày tới.',
    responseType: CalendarDashboardResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getCalendar(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardMonthQueryDto,
  ) {
    const data = await this.dashboardService.getCalendar(userId, query);
    return ApiResponse.success(data, 'Lấy dữ liệu lịch tài chính thành công');
  }

  @Get('shared-wallet/:walletId')
  @Permissions(SYSTEM_PERMISSIONS.SPLIT_EXPENSES_READ)
  @SwaggerDoc({
    summary: 'Dashboard 7: Thống kê ví chung & ma trận cấn trừ nợ',
    description: 'Thống kê tỷ trọng đóng góp của thành viên và ma trận cấn trừ nợ tự động tối ưu giao dịch.',
    responseType: SharedWalletDashboardResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getSharedWallet(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.dashboardService.getSharedWalletDashboard(userId, walletId);
    return ApiResponse.success(data, 'Lấy thống kê ví chung thành công');
  }

  @Get('operations')
  @Permissions(SYSTEM_PERMISSIONS.SYSTEM_AUDIT_VIEW)
  @SwaggerDoc({
    summary: 'Dashboard 8: Vận hành nền tảng (Admin)',
    description: 'Số liệu tổng quan về tăng trưởng người dùng, khối lượng giao dịch và sức khỏe hệ thống.',
    responseType: OperationsDashboardResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getOperations() {
    const data = await this.dashboardService.getOperationsDashboard();
    return ApiResponse.success(data, 'Lấy dữ liệu vận hành nền tảng thành công');
  }
}