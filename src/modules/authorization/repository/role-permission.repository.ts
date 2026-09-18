import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermission)
    private readonly repo: Repository<RolePermission>,
  ) {}

  async assignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission> {
    const existing = await this.repo.findOne({
      where: { roleId, permissionId },
    });
    if (existing) return existing;

    const rolePerm = this.repo.create({ roleId, permissionId });
    return this.repo.save(rolePerm);
  }

  async replacePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<RolePermission[]> {
    await this.repo.delete({ roleId });
    const records = permissionIds.map((permissionId) =>
      this.repo.create({ roleId, permissionId }),
    );
    return this.repo.save(records);
  }

  findByRoleId(roleId: string): Promise<RolePermission[]> {
    return this.repo.find({
      where: { roleId },
      relations: ['permission'],
    });
  }
}
