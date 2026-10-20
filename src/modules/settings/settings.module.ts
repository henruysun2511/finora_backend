// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSetting } from '../users/entities/user-setting.entity';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsMapper } from './mapper/settings.mapper';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting])],
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsMapper, SettingsService],
  exports: [SettingsService, SettingsRepository],
})
export class SettingsModule {}
