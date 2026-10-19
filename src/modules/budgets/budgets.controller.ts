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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { ApiResponse } from '../../common/response/api-response';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BudgetQueryDto } from './dto/request/budget-query.dto';
import { CreateBudgetDto } from './dto/request/create-budget.dto';
import { UpdateBudgetDto } from './dto/request/update-budget.dto';
import { BudgetResponseDto } from './dto/response/budget-response.dto';
import { BudgetStatusResponseDto } from './dto/response/budget-status-response.dto';
import { BudgetsService } from './budgets.service';

@ApiTags('Budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_CREATE)
  @SwaggerDoc({
    summary: 'Tạo ngân sách cho danh mục chi tiêu',
    bodyType: CreateBudgetDto,
    responseType: BudgetResponseDto,
    status: HttpStatus.CREATED,
    bearerAuth: true,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return ApiResponse.created(
      await this.budgetsService.createBudget(userId, dto),
      'Tạo ngân sách thành công',
    );
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách ngân sách của các ví được truy cập',
    description: 'Trả về danh sách ngân sách có phân trang.',
    bearerAuth: true,
  })
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: BudgetQueryDto,
  ) {
    return this.budgetsService.getBudgets(userId, query);
  }

  @Get(':id/status')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_READ)
  @SwaggerDoc({
    summary: 'Lấy tiến độ chi tiêu ngân sách hiện tại',
    responseType: BudgetStatusResponseDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của ngân sách' })
  async status(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return ApiResponse.success(
      await this.budgetsService.getBudgetStatus(userId, id),
      'Lấy tiến độ ngân sách thành công',
    );
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_READ)
  @SwaggerDoc({
    summary: 'Xem chi tiết ngân sách và lịch sử chu kỳ',
    responseType: BudgetResponseDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của ngân sách' })
  async detail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return ApiResponse.success(
      await this.budgetsService.getBudgetById(userId, id),
      'Lấy chi tiết ngân sách thành công',
    );
  }

  @Put(':id')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_UPDATE)
  @SwaggerDoc({
    summary: 'Cập nhật hạn mức, chu kỳ hoặc rollover',
    bodyType: UpdateBudgetDto,
    responseType: BudgetResponseDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của ngân sách' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return ApiResponse.success(
      await this.budgetsService.updateBudget(userId, id, dto),
      'Cập nhật ngân sách thành công',
    );
  }

  @Post(':id/reset-period')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_UPDATE)
  @SwaggerDoc({
    summary: 'Chủ động chuyển ngân sách sang chu kỳ mới',
    responseType: BudgetResponseDto,
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của ngân sách' })
  async resetPeriod(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return ApiResponse.success(
      await this.budgetsService.resetPeriod(userId, id),
      'Chuyển chu kỳ ngân sách thành công',
    );
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.BUDGETS_DELETE)
  @SwaggerDoc({
    summary: 'Xóa mềm ngân sách',
    bearerAuth: true,
  })
  @ApiParam({ name: 'id', description: 'UUID của ngân sách' })
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.budgetsService.deleteBudget(userId, id);
    return ApiResponse.success(null, 'Xóa ngân sách thành công');
  }
}
