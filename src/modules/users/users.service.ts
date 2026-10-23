import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserMapper } from './mapper/user.mapper';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { UserQueryDto } from './dto/request/user-query.dto';
import { AssignRoleDto } from './dto/request/assign-role.dto';
import { UserResponseDto } from './dto/response/user.dto';
import {
  EmailAlreadyExistsException,
  UserNotFoundException,
} from './exceptions/user.exception';
import { PaginatedResponse } from '../../common/response/api-response';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';

import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly userMapper: UserMapper,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    const result = this.userMapper.toResponseDto(user);

    this.auditLogsService.recordLog({
      userId: actorId ?? user.id,
      action: AUDIT_LOG_ACTION.CREATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: user.id,
      newValue: {
        email: user.email,
        fullName: user.fullName,
        username: user.username,
      },
    });

    return result;
  }

  async findAll(
    query: UserQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const [users, total] = await this.userRepository.findWithPagination(query);

    return PaginatedResponse.of(
      this.userMapper.toResponseDtoList(users),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return this.userMapper.toResponseDto(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const oldSnapshot = {
      fullName: user.fullName,
      phone: user.phone,
      avatar: user.avatar,
    };

    const updatePayload: Partial<User> = {};
    if (dto.fullName !== undefined) updatePayload.fullName = dto.fullName;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone;
    if (dto.avatar !== undefined) updatePayload.avatar = dto.avatar;

    const updated = await this.userRepository.update(userId, updatePayload);
    const result = this.userMapper.toResponseDto(updated);

    this.auditLogsService.recordLog({
      userId,
      action: AUDIT_LOG_ACTION.PROFILE_UPDATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: userId,
      oldValue: oldSnapshot,
      newValue: {
        fullName: result.fullName,
        phone: result.phone,
        avatar: result.avatar,
      },
    });

    return result;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.userRepository.findByEmail(dto.email);
      if (existing) {
        throw new EmailAlreadyExistsException(dto.email);
      }
    }

    const oldSnapshot = {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
    };

    const updatePayload: Record<string, unknown> = { ...dto };
    if ((dto as any).password) {
      updatePayload.password = await bcrypt.hash((dto as any).password, 10);
    }

    const updated = await this.userRepository.update(id, updatePayload);
    const result = this.userMapper.toResponseDto(updated);

    this.auditLogsService.recordLog({
      userId: actorId ?? id,
      action: AUDIT_LOG_ACTION.PROFILE_UPDATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: id,
      oldValue: oldSnapshot,
      newValue: {
        fullName: result.fullName,
        email: result.email,
        phone: result.phone,
        avatar: result.avatar,
        status: result.status,
      },
    });

    return result;
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    await this.userRepository.softDelete(id);

    this.auditLogsService.recordLog({
      userId: actorId ?? id,
      action: AUDIT_LOG_ACTION.DELETE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: id,
      oldValue: {
        email: user.email,
        fullName: user.fullName,
      },
    });
  }

  async assignRoles(
    id: string,
    dto: AssignRoleDto,
    actorId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    const oldRoles = user.userRoles?.map((ur) => ur.roleId) ?? [];
    await this.userRoleRepository.replaceRoles(id, dto.roleIds);
    const refreshed = await this.userRepository.findById(id);
    const result = this.userMapper.toResponseDto(refreshed!);

    this.auditLogsService.recordLog({
      userId: actorId ?? id,
      action: AUDIT_LOG_ACTION.UPDATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: id,
      oldValue: { roleIds: oldRoles },
      newValue: { roleIds: dto.roleIds },
    });

    return result;
  }

  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────
  // Các hàm dưới đây được cung cấp để các service ngoại vi (AuthService, JwtStrategy...)
  // gọi trực tiếp thay vì tự ý inject UserRepository / UserRoleRepository / UserMapper.

  /**
   * [CROSS-MODULE] Tìm entity User theo ID kèm đầy đủ quan hệ roles & permissions.
   * Dùng cho JwtStrategy validate token hoặc AuthService kiểm tra user hiện tại.
   *
   * @param id - UUID của người dùng
   * @returns User entity hoặc null nếu không tồn tại
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * [CROSS-MODULE] Tìm entity User theo email, hỗ trợ tùy chọn lấy kèm mật khẩu đã hash.
   * Dùng cho AuthService xử lý đăng nhập, đăng ký và đổi mật khẩu.
   *
   * @param email - Địa chỉ email của user
   * @param includePassword - Có nạp trường password vào kết quả hay không (mặc định: false)
   * @returns User entity hoặc null nếu không tìm thấy
   */
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<User | null> {
    return this.userRepository.findByEmail(email, includePassword);
  }

  /**
   * [CROSS-MODULE] Tìm entity User theo username, hỗ trợ tùy chọn lấy kèm mật khẩu đã hash.
   * Dùng cho AuthService xử lý đăng nhập và đăng ký bằng username.
   *
   * @param username - Tên đăng nhập của user
   * @param includePassword - Có nạp trường password vào kết quả hay không (mặc định: false)
   * @returns User entity hoặc null nếu không tìm thấy
   */
  async findByUsername(
    username: string,
    includePassword = false,
  ): Promise<User | null> {
    return this.userRepository.findByUsername(username, includePassword);
  }

  /**
   * [CROSS-MODULE] Tìm entity User theo Google ID.
   * Dùng cho AuthService xử lý luồng đăng nhập Google OAuth2.
   *
   * @param googleId - Định danh người dùng do Google cung cấp
   * @returns User entity hoặc null nếu chưa liên kết Google
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  /**
   * [CROSS-MODULE] Tạo bản ghi User mới phục vụ luồng xác thực (Local / Social).
   * Dùng cho AuthService tạo user khi người dùng đăng ký hoặc đăng nhập Google lần đầu.
   *
   * @param data - Thuộc tính khởi tạo User
   * @returns User entity vừa được tạo
   */
  async createAuthUser(data: Partial<User>): Promise<User> {
    return this.userRepository.create(data);
  }

  /**
   * [CROSS-MODULE] Cập nhật thông tin User từ luồng xác thực (đổi mật khẩu, liên kết googleId...).
   * Dùng cho AuthService cập nhật trạng thái user.
   *
   * @param id - UUID của người dùng
   * @param data - Các trường cần cập nhật
   * @returns User entity sau khi cập nhật
   */
  async updateAuthUser(id: string, data: Partial<User>): Promise<User> {
    return this.userRepository.update(id, data);
  }

  /**
   * [CROSS-MODULE] Gán một vai trò (Role) cho người dùng.
   * Dùng cho AuthService gán vai trò mặc định (USER) khi đăng ký tài khoản.
   *
   * @param userId - UUID của người dùng
   * @param roleId - UUID của vai trò cần gán
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.assignRole(userId, roleId);
  }

  /**
   * [CROSS-MODULE] Chuyển đổi entity User sang UserResponseDto mà không cần inject UserMapper.
   * Dùng cho AuthService và JwtStrategy chuẩn hóa dữ liệu trả về cho client.
   *
   * @param user - User entity cần map
   * @returns UserResponseDto chuẩn
   */
  toResponseDto(user: User): UserResponseDto {
    return this.userMapper.toResponseDto(user);
  }
}
