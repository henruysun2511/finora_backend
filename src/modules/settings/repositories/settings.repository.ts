// src/modules/settings/repositories/settings.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  create(entityLike: Partial<Setting>): Setting {
    return this.repo.create(entityLike);
  }

  async save(entity: Setting): Promise<Setting> {
    return this.repo.save(entity);
  }

  async findByUserId(userId: string): Promise<Setting | null> {
    return this.repo.findOne({
      where: { userId },
    });
  }

  async findByUserIdWithPin(userId: string): Promise<Setting | null> {
    return this.repo
      .createQueryBuilder('setting')
      .addSelect('setting.pinHash')
      .where('setting.userId = :userId', { userId })
      .getOne();
  }

  async updateByUserId(
    userId: string,
    partial: Partial<Setting>,
  ): Promise<void> {
    await this.repo.update({ userId }, partial);
  }
}
