import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MascotsService } from './mascots.service';
import { CreateMascotDto } from './dto/request/create-mascot.dto';
import { UpdateMascotDto } from './dto/request/update-mascot.dto';
import { MascotTierResponseDto } from './dto/response/mascot-tier-response.dto';
import { CurrentMascotResponseDto } from './dto/response/current-mascot-response.dto';
import { MascotEvolutionResponseDto } from './dto/response/mascot-evolution-response.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Mascots')
@ApiBearerAuth('access-token')
@Controller('mascots')
export class MascotsController {
  constructor(private readonly mascotsService: MascotsService) {}

  @Get()
  @SwaggerDoc({
    summary: 'Danh sách linh vật AI (Mascots Lineup)',
    description:
      'Lấy toàn bộ danh sách linh vật Finora kèm khoảng tài sản ròng, lời thoại và mã thẻ HTML/SVG',
    responseType: MascotTierResponseDto,
    isArray: true,
  })
  async getAllMascots() {
    const mascots = await this.mascotsService.findAll();
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách linh vật thành công',
      data: mascots,
    });
  }

  @Get('current')
  @SwaggerDoc({
    summary: 'Linh vật AI hiện tại của người dùng',
    description:
      'Tự động tính toán Tài sản ròng (Net Worth = Tổng số dư ví - Tổng nợ) để xác định Linh vật, câu thoại động viên và mã giao diện HTML/SVG của linh vật đang đồng hành',
    responseType: CurrentMascotResponseDto,
  })
  async getCurrentMascot(@CurrentUser('id') userId: string) {
    const currentMascot = await this.mascotsService.getCurrentUserMascot(userId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy linh vật hiện tại thành công',
      data: currentMascot,
    });
  }

  @Post('sync-evolution')
  @SwaggerDoc({
    summary: 'Kiểm tra & Đồng bộ sự kiện tiến hóa / thăng hạng linh vật',
    description:
      'Chủ động kiểm tra biến động tài sản ròng. Nếu đủ điều kiện mở khóa linh vật mới, hệ thống sẽ kích hoạt thông báo và gửi tín hiệu realtime qua WebSocket',
    responseType: MascotEvolutionResponseDto,
  })
  async syncMascotEvolution(@CurrentUser('id') userId: string) {
    const result = await this.mascotsService.checkMascotEvolution(userId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: result.evolved
        ? (result.isLevelUp ? '🎉 Thăng hạng linh vật thành công!' : 'Đồng bộ linh vật thành công!')
        : 'Chưa có sự thay đổi linh vật',
      data: result,
    });
  }

  @Get(':id')
  @SwaggerDoc({
    summary: 'Chi tiết linh vật AI theo UUID',
    description: 'Lấy thông tin chi tiết một linh vật theo UUID',
    responseType: MascotTierResponseDto,
  })
  async getMascotById(@Param('id', ParseUUIDPipe) id: string) {
    const mascot = await this.mascotsService.findOne(id);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết linh vật thành công',
      data: mascot,
    });
  }

  @Post()
  @Permissions(SYSTEM_PERMISSIONS.MASCOTS_CREATE)
  @SwaggerDoc({
    summary: 'Thêm mới linh vật AI (Admin)',
    description:
      'Chỉ quản trị viên hệ thống có quyền tạo linh vật mới với các mốc Net Worth và mã thẻ HTML/SVG',
    responseType: MascotTierResponseDto,
    status: 201,
  })
  async createMascot(@Body() dto: CreateMascotDto) {
    const created = await this.mascotsService.create(dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Thêm mới linh vật thành công',
      data: created,
    });
  }

  @Patch(':id')
  @Permissions(SYSTEM_PERMISSIONS.MASCOTS_UPDATE)
  @SwaggerDoc({
    summary: 'Cập nhật linh vật AI (Admin)',
    description:
      'Chỉ quản trị viên hệ thống có quyền cập nhật tên hiển thị, khoảng tài sản ròng, lời thoại hoặc mã giao diện HTML/SVG',
    responseType: MascotTierResponseDto,
  })
  async updateMascot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMascotDto,
  ) {
    const updated = await this.mascotsService.update(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật linh vật thành công',
      data: updated,
    });
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.MASCOTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa mềm linh vật AI (Admin)',
    description:
      'Chỉ quản trị viên hệ thống có quyền xóa mềm linh vật (không được xóa nếu chỉ còn 1 linh vật)',
    status: 204,
  })
  async deleteMascot(@Param('id', ParseUUIDPipe) id: string) {
    await this.mascotsService.remove(id);
  }
}
