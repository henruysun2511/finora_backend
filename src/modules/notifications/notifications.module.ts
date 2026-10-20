import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationMapper } from './mapper/notification.mapper';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { JwtConfig } from '../../config/jwt.config';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule.register({
      secret: JwtConfig.SECRET,
      signOptions: { expiresIn: JwtConfig.EXPIRES_IN as any },
    }),
    SettingsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationMapper,
    NotificationGateway,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}
