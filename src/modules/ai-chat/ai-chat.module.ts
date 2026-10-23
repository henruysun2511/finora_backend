// src/modules/ai-chat/ai-chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { DashboardModule } from '../dashboards/dashboards.module';
import { MascotsModule } from '../mascots/mascots.module';
import { SettingsModule } from '../settings/settings.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { PendingAction } from './entities/pending-action.entity';
import { AiChatMapper } from './mapper/ai-chat.mapper';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { PendingActionRepository } from './repositories/pending-action.repository';
import { PendingActionsScheduler } from './schedulers/pending-actions.scheduler';
import { CannedQueryRegistry } from './services/canned-query.registry';
import { CategoryClassifierService } from './services/category-classifier.service';
import { ChartBuilderService } from './services/chart-builder.service';
import { ChatRateLimiter } from './services/chat-rate-limiter.service';
import { EntityExtractorService } from './services/entity-extractor.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { MascotAdviceService } from './services/mascot-advice.service';
import { MascotContextService } from './services/mascot-context.service';
import { MascotToneService } from './services/mascot-tone.service';
import { ModelGatewayService } from './services/model-gateway.service';
import { OcrService } from './services/ocr.service';
import { QueryPlannerService } from './services/query-planner.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TransactionDraftService } from './services/transaction-draft.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, PendingAction]),
    WalletsModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    DashboardModule,
    MascotsModule,
    SettingsModule,
  ],
  controllers: [AiChatController],
  providers: [
    ChatMessageRepository,
    PendingActionRepository,
    AiChatMapper,
    AiChatService,
    PendingActionsScheduler,
    // pipeline AI
    ModelGatewayService,
    SpeechToTextService,
    OcrService,
    IntentClassifierService,
    EntityExtractorService,
    CategoryClassifierService,
    TransactionDraftService,
    QueryPlannerService,
    ChartBuilderService,
    CannedQueryRegistry,
    MascotContextService,
    MascotToneService,
    MascotAdviceService,
    ChatRateLimiter,
  ],
  exports: [AiChatService, CannedQueryRegistry],
})
export class AiChatModule {}
