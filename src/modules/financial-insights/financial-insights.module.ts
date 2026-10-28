import { Module } from '@nestjs/common';
import { WalletsModule } from '../wallets/wallets.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiChatModule } from '../ai-chat/ai-chat.module';
import { FinancialInsightsController } from './financial-insights.controller';
import { FinancialInsightsService } from './financial-insights.service';
import { FinancialInsightsMapper } from './mapper/financial-insights.mapper';
import { InsightGeneratorService } from './services/insight-generator.service';
import { AiInsightAdvisorService } from './services/ai-insight-advisor.service';

@Module({
  imports: [WalletsModule, BudgetsModule, TransactionsModule, AiChatModule],
  controllers: [FinancialInsightsController],
  providers: [
    FinancialInsightsService,
    FinancialInsightsMapper,
    InsightGeneratorService,
    AiInsightAdvisorService,
  ],
  exports: [
    FinancialInsightsService,
    FinancialInsightsMapper,
    AiInsightAdvisorService,
  ],
})
export class FinancialInsightsModule {}
