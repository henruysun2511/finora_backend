import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardRepository {
  constructor(private readonly dataSource: DataSource) {}

  async calculateNetWorth(userId: string, walletId?: string): Promise<number> {
    const query = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(acc.balance), 0)', 'totalBalance')
      .from('accounts', 'acc')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere('acc.is_excluded_from_net_worth = false')
      .andWhere('acc.deleted_at IS NULL');

    if (walletId) {
      query.andWhere('acc.wallet_id = :walletId', { walletId });
    }

    const result = await query.getRawOne();
    return Number(result.totalBalance);
  }

  async getMonthlyCashflow(userId: string, monthStr: string, walletId?: string) {
    const query = this.dataSource
      .createQueryBuilder()
      .select("SUM(CASE WHEN tx.type = 'INCOME' THEN tx.amount ELSE 0 END)", 'totalIncome')
      .addSelect("SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END)", 'totalExpense')
      .from('transactions', 'tx')
      .innerJoin('accounts', 'acc', 'tx.account_id = acc.id')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere("tx.status = 'CONFIRMED'")
      .andWhere('tx.exclude_from_report = false')
      .andWhere("TO_CHAR(tx.transaction_date, 'YYYY-MM') = :monthStr", { monthStr })
      .andWhere('tx.deleted_at IS NULL');

    if (walletId) {
      query.andWhere('acc.wallet_id = :walletId', { walletId });
    }

    const result = await query.getRawOne();
    return {
      income: Number(result.totalIncome || 0),
      expense: Number(result.totalExpense || 0),
    };
  }
}