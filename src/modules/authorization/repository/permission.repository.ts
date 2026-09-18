import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Permission | null> {
    return this.repo.findOne({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async create(data: Partial<Permission>): Promise<Permission> {
    const permission = this.repo.create({
      ...data,
      code: data.code?.trim().toUpperCase(),
    });
    return this.repo.save(permission);
  }

  async update(id: string, data: Partial<Permission>): Promise<Permission> {
    const updateData = { ...data };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    await this.repo.update(id, updateData);
    const updated = await this.findById(id);
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
