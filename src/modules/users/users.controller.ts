import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserQueryDto } from './dto/request/user-query.dto';
import { AssignRoleDto } from './dto/request/assign-role.dto';
import { UserResponseDto } from './dto/response/user.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../audit-logs/decorators/auditable.decorator';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @SwaggerDoc({
    summary: 'Thông tin cá nhân (Profile)',
    description:
      'Lấy thông tin tài khoản đang đăng nhập kèm danh sách vai trò và quyền hạn',
    responseType: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: UserResponseDto) {
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin tài khoản thành công',
      data: user,
    });
  }

  @Patch('profile')
  @Auditable({
    action: AUDIT_LOG_ACTION.PROFILE_UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
  })
  @SwaggerDoc({
    summary: 'Cập nhật thông tin cá nhân (Profile)',
    description:
      'Người dùng tự cập nhật họ tên, số điện thoại hoặc ảnh đại diện của chính mình',
    responseType: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: user,
    });
  }

  @Get()
  @Permissions(SYSTEM_PERMISSIONS.USERS_READ)
  @SwaggerDoc({
    summary: 'Danh sách người dùng',
    description: 'Lấy danh sách người dùng có phân trang, tìm kiếm và lọc',
    responseType: UserResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_READ)
  @SwaggerDoc({
    summary: 'Chi tiết người dùng',
    description: 'Lấy thông tin người dùng theo UUID kèm danh sách vai trò',
    responseType: UserResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Lấy thông tin người dùng thành công',
      data: user,
    });
  }

  @Patch(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_UPDATE)
  @Auditable({
    action: AUDIT_LOG_ACTION.UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
  })
  @SwaggerDoc({
    summary: 'Cập nhật thông tin người dùng',
    description:
      'Cập nhật họ tên, mật khẩu, số điện thoại, avatar hoặc trạng thái',
    responseType: UserResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId?: string,
  ) {
    const user = await this.usersService.update(id, dto, actorId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật thông tin người dùng thành công',
      data: user,
    });
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.USERS_DELETE)
  @Auditable({
    action: AUDIT_LOG_ACTION.DELETE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa mềm người dùng',
    description: 'Đánh dấu xóa mềm người dùng trong hệ thống',
    status: 204,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorId?: string,
  ) {
    await this.usersService.remove(id, actorId);
  }

  @Post(':id/roles')
  @Permissions(SYSTEM_PERMISSIONS.USERS_ASSIGN_ROLE)
  @Auditable({
    action: AUDIT_LOG_ACTION.UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.USER,
  })
  @SwaggerDoc({
    summary: 'Gán vai trò cho người dùng',
    description: 'Cập nhật danh sách vai trò (roles) cho tài khoản người dùng',
    responseType: UserResponseDto,
  })
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser('id') actorId?: string,
  ) {
    const user = await this.usersService.assignRoles(id, dto, actorId);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Gán vai trò cho người dùng thành công',
      data: user,
    });
  }
}
