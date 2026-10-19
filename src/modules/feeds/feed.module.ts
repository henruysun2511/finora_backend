import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostReaction } from './entities/post-reaction.entity';
import { PostReactionRepository } from './repositories/post-reaction.repository';
import { FeedMapper } from './mapper/feed.mapper';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostReaction]),
    TransactionsModule,
    FriendsModule,
    NotificationsModule,
  ],
  controllers: [FeedController],
  providers: [PostReactionRepository, FeedMapper, FeedService],
  exports: [FeedService],
})
export class FeedModule {}