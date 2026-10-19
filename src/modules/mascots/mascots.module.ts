import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetTier } from './entities/asset-tier.entity';
import { UserSetting } from '../users/entities/user-setting.entity';
import { MascotRepository } from './repositories/mascot.repository';
import { MascotMapper } from './mapper/mascot.mapper';
import { MascotsService } from './mascots.service';
import { MascotsController } from './mascots.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetTier, UserSetting]),
    NotificationsModule,
  ],
  controllers: [MascotsController],
  providers: [MascotsService, MascotRepository, MascotMapper],
  exports: [MascotsService, MascotRepository, MascotMapper],
})
export class MascotsModule {}
