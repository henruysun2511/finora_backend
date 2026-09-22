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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserQueryDto } from './dto/request/user-query.dto';
import { AssignRoleDto } from './dto/request/assign-role.dto';
import { UserResponseDto } from './dto/response/user.dto';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { Roles } from '../authorization/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../common/constants/role.constant';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SYSTEM_ROLES.ADMIN)
export class UsersController {


  constructor(private readonly usersService: UsersService) {}

  @Post()
  @SwaggerDoc({
    summary: 'Tạo tài khoản người dùng mới',
    description: 'Tạo người dùng mới trong hệ thống bằng email và mật khẩu',
    responseType: UserResponseDto,
    status: 201,
  })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return new ApiResponse({
      statusCode: HttpStatus.CREATED,
      message: 'Tạo tài khoản người dùng thành công',
      data: user,
    });
  }

  @Get()
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
  @SwaggerDoc({
    summary: 'Cập nhật thông tin người dùng',
    description:
      'Cập nhật họ tên, mật khẩu, số điện thoại, avatar hoặc trạng thái',
    responseType: UserResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Cập nhật thông tin người dùng thành công',
      data: user,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SwaggerDoc({
    summary: 'Xóa mềm người dùng',
    description: 'Đánh dấu xóa mềm người dùng trong hệ thống',
    status: 204,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/roles')
  @SwaggerDoc({
    summary: 'Gán vai trò cho người dùng',
    description: 'Cập nhật danh sách vai trò (roles) cho tài khoản người dùng',
    responseType: UserResponseDto,
  })
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
  ) {
    const user = await this.usersService.assignRoles(id, dto);
    return new ApiResponse({
      statusCode: HttpStatus.OK,
      message: 'Gán vai trò cho người dùng thành công',
      data: user,
    });
  }
}
