import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectRepository(UserRole)
    private readonly repo: Repository<UserRole>,
  ) {}

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    const existing = await this.repo.findOne({ where: { userId, roleId } });
    if (existing) return existing;

    const userRole = this.repo.create({ userId, roleId });
    return this.repo.save(userRole);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.repo.delete({ userId, roleId });
  }

  async replaceRoles(userId: string, roleIds: string[]): Promise<UserRole[]> {
    await this.repo.delete({ userId });
    const userRoles = roleIds.map((roleId) =>
      this.repo.create({ userId, roleId }),
    );
    return this.repo.save(userRoles);
  }

  findByUserId(userId: string): Promise<UserRole[]> {
    return this.repo.find({
      where: { userId },
      relations: ['role'],
    });
  }
}
