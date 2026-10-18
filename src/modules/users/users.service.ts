import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserMapper } from './mapper/user.mapper';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserQueryDto } from './dto/request/user-query.dto';
import { AssignRoleDto } from './dto/request/assign-role.dto';
import { UserResponseDto } from './dto/response/user.dto';
import {
  EmailAlreadyExistsException,
  UserNotFoundException,
} from './exceptions/user.exception';
import { PaginatedResponse } from '../../common/response/api-response';

import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly userMapper: UserMapper,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    return this.userMapper.toResponseDto(user);
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

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
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

    const updatePayload: Record<string, unknown> = { ...dto };
    if (dto.password) {
      updatePayload.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.userRepository.update(id, updatePayload);
    return this.userMapper.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    await this.userRepository.softDelete(id);
  }

  async assignRoles(id: string, dto: AssignRoleDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    await this.userRoleRepository.replaceRoles(id, dto.roleIds);
    const refreshed = await this.userRepository.findById(id);
    return this.userMapper.toResponseDto(refreshed!);
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
