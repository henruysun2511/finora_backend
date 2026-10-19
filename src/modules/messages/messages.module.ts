import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DirectMessage } from './entities/direct-message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { DirectMessageRepository } from './repositories/direct-message.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMapper } from './mapper/message.mapper';
import { MessagesGateway } from './gateways/messages.gateway';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([DirectMessage, MessageReaction]),
    JwtModule.register({
      secret: JwtConfig.SECRET,
      signOptions: { expiresIn: JwtConfig.EXPIRES_IN as any },
    }),
    FriendsModule,
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [
    DirectMessageRepository,
    MessageReactionRepository,
    MessageMapper,
    MessagesGateway,
    MessagesService,
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
