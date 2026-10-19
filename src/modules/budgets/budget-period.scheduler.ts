import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BudgetsService } from './budgets.service';

@Injectable()
export class BudgetPeriodScheduler {
  private isAdvancing = false;

  constructor(private readonly budgetsService: BudgetsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'UTC',
  })
  async advanceBudgetPeriods(): Promise<void> {
    if (this.isAdvancing) return;
    this.isAdvancing = true;
    try {
      await this.budgetsService.advancePeriods();
    } finally {
      this.isAdvancing = false;
    }
  }
}
