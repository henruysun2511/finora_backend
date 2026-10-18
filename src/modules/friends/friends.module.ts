import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendshipRepository } from './repository/friends.repository';
import { FriendMapper } from './mapper/friends.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship])],
  controllers: [FriendsController],
  providers: [FriendsService, FriendshipRepository, FriendMapper],
  exports: [FriendsService], // Xuất service nếu module khác cần dùng areFriends
})
export class FriendsModule {}