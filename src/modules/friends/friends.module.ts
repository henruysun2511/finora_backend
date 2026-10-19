import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendMapper } from './mapper/friends.mapper';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship]),
    NotificationsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService, FriendshipRepository, FriendMapper],
  exports: [FriendsService],
})
export class FriendsModule {}