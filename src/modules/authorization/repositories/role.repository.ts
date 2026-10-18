import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.repo.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  findByCode(code: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { code: code.trim().toUpperCase() },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  async create(data: Partial<Role>): Promise<Role> {
    const role = this.repo.create({
      ...data,
      code: data.code?.trim().toUpperCase(),
    });
    return this.repo.save(role);
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const updateData = { ...data };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    await this.repo.update(id, updateData);
    const updated = await this.findById(id);
    return updated!;
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.repo.update(id, {
      isActive: false,
      deletedBy,
      deletedAt: new Date(),
    });
  }
}
