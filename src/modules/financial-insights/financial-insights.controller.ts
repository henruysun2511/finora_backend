import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinancialInsightsService } from './financial-insights.service';
import { SpendingPaceQueryDto } from './dto/request/spending-pace-query.dto';
import { SpendingPaceResponseDto } from './dto/response/spending-pace-response.dto';
import { TodaySpendingGuideResponseDto } from './dto/response/today-spending-guide-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';

@ApiTags('Financial Insights')
@ApiBearerAuth('access-token')
@Controller('insights')
@UseGuards(JwtAuthGuard)
export class FinancialInsightsController {
  constructor(
    private readonly insightsService: FinancialInsightsService,
  ) {}

  /**
   * GET /api/v1/insights/wallets/:walletId/pace
   * Lấy tiến độ chi tiêu thời gian thực & gợi ý chi tiêu mỗi ngày của một ví cụ thể.
   */
  @Get('wallets/:walletId/pace')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Tiến độ chi tiêu & hạn mức mỗi ngày theo ví',
    description:
      'Tính toán tiến độ chi tiêu thời gian thực, tốc độ đốt tiền (burn-rate), số ngày còn lại và đưa ra lời khuyên chi tiêu tối đa mỗi ngày (có AI Advisor).',
    responseType: SpendingPaceResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getWalletSpendingPace(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Query() query: SpendingPaceQueryDto,
  ) {
    const data = await this.insightsService.getWalletSpendingPace(
      userId,
      walletId,
      query,
    );
    return ApiResponse.success(data, 'Lấy tiến độ chi tiêu ví thành công');
  }

  /**
   * GET /api/v1/insights/pace
   * Lấy tiến độ chi tiêu tổng hợp trên tất cả các ví của người dùng.
   */
  @Get('pace')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Tiến độ chi tiêu & hạn mức mỗi ngày tổng hợp toàn bộ ví',
    description:
      'Tổng hợp số liệu chi tiêu, ngân sách trên tất cả các ví của người dùng và đưa ra kế hoạch chi tiêu an toàn cho phần còn lại của tháng (có AI Advisor).',
    responseType: SpendingPaceResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getOverallSpendingPace(
    @CurrentUser('id') userId: string,
    @Query() query: SpendingPaceQueryDto,
  ) {
    const data = await this.insightsService.getOverallSpendingPace(userId, query);
    return ApiResponse.success(
      data,
      'Lấy tiến độ chi tiêu tổng hợp thành công',
    );
  }

  /**
   * GET /api/v1/insights/today
   * API Widget gọn nhẹ cho Mobile Home: Hôm nay được tiêu bao nhiêu?
   */
  @Get('today')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Widget chi tiêu hôm nay (Safe-to-Spend Today)',
    description:
      'Dành cho Home Widget / Card trang chủ mobile: Trả về số tiền được phép tiêu hôm nay, số tiền đã tiêu, số tiền còn lại và lời khuyên ngắn gọn.',
    responseType: TodaySpendingGuideResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async getTodayGuide(
    @CurrentUser('id') userId: string,
    @Query('walletId') walletId?: string,
  ) {
    const data = await this.insightsService.getTodayGuide(userId, walletId);
    return ApiResponse.success(
      data,
      'Lấy thông tin gợi ý chi tiêu hôm nay thành công',
    );
  }

  /**
   * POST /api/v1/insights/wallets/:walletId/refresh-ai-advice
   * Làm mới lời khuyên từ AI Advisor (Bỏ qua cache)
   */
  @Post('wallets/:walletId/refresh-ai-advice')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Làm mới lời khuyên từ AI Advisor cho ví',
    description:
      'Xóa cache lời khuyên hôm nay và kích hoạt AI Model sinh lời khuyên tài chính cá nhân hóa mới nhất.',
    responseType: SpendingPaceResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async refreshWalletAiAdvice(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.insightsService.refreshAiAdvice(userId, walletId);
    return ApiResponse.success(data, 'Làm mới lời khuyên AI thành công');
  }

  /**
   * POST /api/v1/insights/refresh-ai-advice
   * Làm mới lời khuyên từ AI Advisor cho toàn bộ ví
   */
  @Post('refresh-ai-advice')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Làm mới lời khuyên từ AI Advisor cho toàn bộ ví',
    description:
      'Xóa cache lời khuyên hôm nay và kích hoạt AI Model sinh lời khuyên tài chính tổng hợp mới nhất.',
    responseType: SpendingPaceResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async refreshOverallAiAdvice(@CurrentUser('id') userId: string) {
    const data = await this.insightsService.refreshAiAdvice(userId);
    return ApiResponse.success(data, 'Làm mới lời khuyên AI thành công');
  }
}
