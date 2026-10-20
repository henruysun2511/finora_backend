// src/modules/settings/repositories/settings.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSetting } from '../../users/entities/user-setting.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(UserSetting)
    private readonly repo: Repository<UserSetting>,
  ) {}

  create(entityLike: Partial<UserSetting>): UserSetting {
    return this.repo.create(entityLike);
  }

  async save(entity: UserSetting): Promise<UserSetting> {
    return this.repo.save(entity);
  }

  async findByUserId(userId: string): Promise<UserSetting | null> {
    return this.repo.findOne({
      where: { userId },
    });
  }

  async findByUserIdWithPin(userId: string): Promise<UserSetting | null> {
    return this.repo
      .createQueryBuilder('setting')
      .addSelect('setting.pinHash')
      .where('setting.userId = :userId', { userId })
      .getOne();
  }

  async updateByUserId(
    userId: string,
    partial: Partial<UserSetting>,
  ): Promise<void> {
    await this.repo.update({ userId }, partial);
  }
}
