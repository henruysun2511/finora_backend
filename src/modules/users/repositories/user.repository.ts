import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserQueryDto } from '../dto/request/user-query.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
  }

  findByEmail(email: string, includePassword = false): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() });

    if (includePassword) {
      qb.addSelect('user.password');
    }

    return qb.getOne();
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { googleId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return this.repo.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.repo.update(id, userData);
    const updated = await this.findById(id);
    return updated!;
  }

  async findWithPagination(query: UserQueryDto): Promise<[User[], number]> {
    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role');

    if (query.keyword) {
      qb.andWhere(
        '(LOWER(user.email) ILIKE LOWER(:kw) OR LOWER(user.fullName) ILIKE LOWER(:kw))',
        { kw: `%${query.keyword.trim()}%` },
      );
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'fullName', 'email'];
    const sortField = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';

    return qb
      .orderBy(`user.${sortField}`, query.sortOrder ?? 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
  }

  softDelete(id: string): Promise<UpdateResult> {
    return this.repo.softDelete(id);
  }
}
