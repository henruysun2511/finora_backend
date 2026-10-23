import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PendingActionRepository } from '../repositories/pending-action.repository';

@Injectable()
export class PendingActionsScheduler {
  private readonly logger = new Logger(PendingActionsScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly pendingActionRepo: PendingActionRepository,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPendingActions(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;
    try {
      const affected = await this.pendingActionRepo.expireOldPendingActions();
      if (affected > 0) {
        this.logger.log(`Expired ${affected} stale AI pending actions.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error expiring pending actions: ${message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
