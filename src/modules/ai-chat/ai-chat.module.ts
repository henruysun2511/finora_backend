// src/modules/ai-chat/ai-chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { PendingAction } from './entities/pending-action.entity';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { PendingActionRepository } from './repositories/pending-action.repository';
import { LlmService } from './services/llm.service';
import { AiChatMapper } from './mapper/ai-chat.mapper';
import { AiChatService } from './ai-chat.service';
import { AiChatController } from './ai-chat.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { MascotsModule } from '../mascots/mascots.module';
import { SettingsModule } from '../settings/settings.module';

import { PendingActionsScheduler } from './schedulers/pending-actions.scheduler';
import { CannedQueryRegistry } from './services/canned-query.registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, PendingAction]),
    WalletsModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    MascotsModule,
    SettingsModule,
  ],
  controllers: [AiChatController],
  providers: [
    ChatMessageRepository,
    PendingActionRepository,
    LlmService,
    AiChatMapper,
    AiChatService,
    PendingActionsScheduler,
    CannedQueryRegistry,
  ],
  exports: [AiChatService, CannedQueryRegistry],
})
export class AiChatModule {}
