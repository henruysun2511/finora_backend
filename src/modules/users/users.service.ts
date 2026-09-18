import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repository/user.repository';
import { UserRoleRepository } from './repository/user-role.repository';
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
}
