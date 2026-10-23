import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/request/audit-log-query.dto';
import { ExportAuditLogDto } from './dto/request/export-audit-log.dto';
import { AuditLogItemDto } from './dto/response/audit-log-response.dto';
import { AuditLogDetailResponseDto } from './dto/response/audit-log-detail-response.dto';
import { EntityTimelineResponseDto } from './dto/response/entity-timeline-response.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)
  @SwaggerDoc({
    summary: 'Danh sách lịch sử hoạt động (Timeline)',
    description:
      'Truy vấn danh sách nhật ký kiểm toán với các bộ lọc linh hoạt (thời gian, hành động, loại đối tượng, người thực hiện)',
    responseType: AuditLogItemDto,
    isArray: true,
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('isSysAdmin') isSysAdmin: boolean | undefined,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogsService.findAll(userId, query, Boolean(isSysAdmin));
  }

  @Get('export')
  @Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_EXPORT)
  @SwaggerDoc({
    summary: 'Xuất file báo cáo nhật ký (CSV/Excel)',
    description:
      'Xuất dữ liệu nhật ký kiểm toán ra file CSV (UTF-8 BOM) hoặc Excel theo khoảng thời gian',
  })
  async export(
    @CurrentUser('id') userId: string,
    @CurrentUser('isSysAdmin') isSysAdmin: boolean | undefined,
    @Query() query: ExportAuditLogDto,
    @Res() res: Response,
  ) {
    const file = await this.auditLogsService.exportLogs(
      userId,
      query,
      Boolean(isSysAdmin),
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.content);
  }

  @Get('entities/:entityType/:entityId')
  @Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)
  @SwaggerDoc({
    summary: 'Lấy lịch sử biến động riêng của 1 đối tượng',
    description:
      'Lấy toàn bộ dòng thời gian các lần tạo, sửa, đổi trạng thái của duy nhất một đối tượng cụ thể',
    responseType: EntityTimelineResponseDto,
  })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSysAdmin') isSysAdmin: boolean | undefined,
  ) {
    const data = await this.auditLogsService.findByEntity(
      entityType,
      entityId,
      userId,
      Boolean(isSysAdmin),
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy lịch sử biến động đối tượng thành công',
      data,
    });
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.AUDIT_LOGS_READ)
  @SwaggerDoc({
    summary: 'Xem chi tiết 1 bản ghi kiểm toán (Diff View)',
    description:
      'Lấy toàn bộ thông tin chi tiết của một bản ghi audit log kèm so sánh Before vs After',
    responseType: AuditLogDetailResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('isSysAdmin') isSysAdmin: boolean | undefined,
  ) {
    const data = await this.auditLogsService.findOne(
      id,
      userId,
      Boolean(isSysAdmin),
    );
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết nhật ký hoạt động thành công',
      data,
    });
  }
}
