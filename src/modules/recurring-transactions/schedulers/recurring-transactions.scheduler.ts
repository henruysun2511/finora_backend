import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTransactionsService } from '../recurring-transactions.service';

@Injectable()
export class RecurringTransactionsScheduler {
  private readonly logger = new Logger(RecurringTransactionsScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly recurringService: RecurringTransactionsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'UTC',
  })
  async processDueRecurringTransactions(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn(
        'Lần quét giao dịch định kỳ trước đó chưa hoàn thành, bỏ qua lượt này.',
      );
      return;
    }
    this.isProcessing = true;
    this.logger.log(
      'Bắt đầu cron job quét giao dịch định kỳ đến hạn (00:00:00 UTC)...',
    );
    try {
      await this.recurringService.processDueRecurringTransactions();
      this.logger.log('Hoàn thành quét và xử lý giao dịch định kỳ.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi chạy cron job giao dịch định kỳ: ${message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
