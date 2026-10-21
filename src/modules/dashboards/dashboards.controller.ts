import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { DashboardQueryDto } from './dto/request/dashboard-query.dto';
import { OverviewDashboardResponseDto } from './dto/response/overview-dashboard-response.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
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
}