import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTransactionsService } from './recurring-transactions.service';

@Injectable()
export class RecurringTransactionsScheduler {
  private readonly logger = new Logger(RecurringTransactionsScheduler.name);

  constructor(private readonly recurringService: RecurringTransactionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Cron Job chạy lúc 00:00:00 quét giao dịch định kỳ đến hạn...');
    try {
      await this.recurringService.processDueRecurringTransactions();
      this.logger.log('Hoàn thành quét và xử lý giao dịch định kỳ.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi chạy cron job giao dịch định kỳ: ${message}`);
    }
  }
}