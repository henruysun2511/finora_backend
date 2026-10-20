// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsMapper } from './mapper/settings.mapper';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsMapper, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
