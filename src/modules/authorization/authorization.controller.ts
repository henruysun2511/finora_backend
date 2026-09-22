import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationService } from './authorization.service';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { AssignPermissionDto } from './dto/request/assign-permission.dto';
import { CreatePermissionDto } from './dto/request/create-permission.dto';
import { UpdatePermissionDto } from './dto/request/update-permission.dto';
import { RoleResponseDto } from './dto/response/role.dto';
import { PermissionResponseDto } from './dto/response/permission.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../common/constants/role.constant';

@ApiTags('Authorization')
@ApiBearerAuth('access-token')
@Controller({ path: 'authorization', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SYSTEM_ROLES.ADMIN)
export class AuthorizationController {


  constructor(private readonly authzService: AuthorizationService) {}

  // ── Roles Endpoints ───────────────────────────────────────────────────────
  @Post('roles')
  @SwaggerDoc({
    summary: 'Tạo vai trò mới',
    description: 'Thêm mới vai trò vào hệ thống (mã vai trò nhập từ FE)',
    responseType: RoleResponseDto,
    status: 201,
  })
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.authzService.createRole(dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Tạo vai trò thành công',
      data: role,
    });
  }

  @Get('roles')
  @SwaggerDoc({
    summary: 'Danh sách vai trò',
    description: 'Lấy toàn bộ danh sách vai trò kèm danh sách quyền hạn đã gán',
    responseType: RoleResponseDto,
    isArray: true,
  })
  async findAllRoles() {
    const roles = await this.authzService.findAllRoles();
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách vai trò thành công',
      data: roles,
    });
  }

  @Get('roles/:id')
  @SwaggerDoc({
    summary: 'Chi tiết vai trò',
    description: 'Lấy thông tin vai trò theo UUID',
    responseType: RoleResponseDto,
  })
  async findRoleById(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.authzService.findRoleById(id);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin vai trò thành công',
      data: role,
    });
  }

  @Patch('roles/:id')
  @SwaggerDoc({
    summary: 'Cập nhật vai trò',
    description: 'Cập nhật tên hiển thị, mô tả hoặc trạng thái vai trò',
    responseType: RoleResponseDto,
  })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.authzService.updateRole(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật vai trò thành công',
      data: role,
    });
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa mềm vai trò',
    description: 'Đánh dấu xóa mềm vai trò',
    status: 204,
  })
  async removeRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.authzService.softDeleteRole(id);
  }

  @Post('roles/:id/permissions')
  @SwaggerDoc({
    summary: 'Gán quyền hạn cho vai trò',
    description: 'Cập nhật danh sách quyền hạn cho một vai trò',
    responseType: RoleResponseDto,
  })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionDto,
  ) {
    const role = await this.authzService.assignPermissionsToRole(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Gán quyền hạn cho vai trò thành công',
      data: role,
    });
  }

  // ── Permissions Endpoints ─────────────────────────────────────────────────
  @Post('permissions')
  @SwaggerDoc({
    summary: 'Tạo quyền hạn mới',
    description: 'Thêm mới quyền hạn vào hệ thống (mã quyền nhập từ FE)',
    responseType: PermissionResponseDto,
    status: 201,
  })
  async createPermission(@Body() dto: CreatePermissionDto) {
    const permission = await this.authzService.createPermission(dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Tạo quyền hạn thành công',
      data: permission,
    });
  }

  @Get('permissions')
  @SwaggerDoc({
    summary: 'Danh sách quyền hạn',
    description: 'Lấy toàn bộ danh sách quyền hạn trong hệ thống',
    responseType: PermissionResponseDto,
    isArray: true,
  })
  async findAllPermissions() {
    const permissions = await this.authzService.findAllPermissions();
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách quyền hạn thành công',
      data: permissions,
    });
  }

  @Get('permissions/:id')
  @SwaggerDoc({
    summary: 'Chi tiết quyền hạn',
    description: 'Lấy thông tin quyền hạn theo UUID',
    responseType: PermissionResponseDto,
  })
  async findPermissionById(@Param('id', ParseUUIDPipe) id: string) {
    const permission = await this.authzService.findPermissionById(id);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin quyền hạn thành công',
      data: permission,
    });
  }

  @Patch('permissions/:id')
  @SwaggerDoc({
    summary: 'Cập nhật quyền hạn',
    description: 'Cập nhật tên, resource, action hoặc mô tả quyền hạn',
    responseType: PermissionResponseDto,
  })
  async updatePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    const permission = await this.authzService.updatePermission(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật quyền hạn thành công',
      data: permission,
    });
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa quyền hạn',
    description: 'Xóa quyền hạn khỏi hệ thống',
    status: 204,
  })
  async removePermission(@Param('id', ParseUUIDPipe) id: string) {
    await this.authzService.removePermission(id);
  }
}
