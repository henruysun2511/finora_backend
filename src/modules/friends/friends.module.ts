import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendsService } from './friends.service';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship])],
  providers: [FriendsService, FriendshipRepository],
  exports: [FriendsService, FriendshipRepository],
})
export class FriendsModule {}