import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardRepository {
  constructor(private readonly dataSource: DataSource) {}

  private applyUserWalletFilter(query: any, userId: string, walletId?: string) {
    query
      .innerJoin('accounts', 'acc', 'tx.account_id = acc.id')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId });

    if (walletId) {
      query.andWhere('acc.wallet_id = :walletId', { walletId });
    }

    return query;
  }

  async calculateNetWorth(userId: string, walletId?: string): Promise<number> {
    const query = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(acc.balance), 0)', 'totalBalance')
      .from('accounts', 'acc')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
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

  async getOverviewDetails(userId: string, walletId: string | undefined, month: string) {
    const accountsQuery = this.dataSource
      .createQueryBuilder()
      .select('acc.id', 'id')
      .addSelect('acc.name', 'name')
      .addSelect('acc.type', 'type')
      .addSelect('acc.balance', 'balance')
      .addSelect('false', 'isExcludedFromNetWorth')
      .from('accounts', 'acc')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere('acc.deleted_at IS NULL')
      .andWhere('acc.is_archived = false')
      .orderBy('acc.name', 'ASC');
    if (walletId) accountsQuery.andWhere('w.id = :walletId', { walletId });

    const transactionQuery = this.dataSource
      .createQueryBuilder()
      .select('tx.id', 'id')
      .addSelect('tx.name', 'name')
      .addSelect('tx.amount', 'amount')
      .addSelect('tx.type', 'type')
      .addSelect('cat.name', 'categoryName')
      .addSelect('tx.transaction_date', 'transactionDate')
      .from('transactions', 'tx')
      .innerJoin('accounts', 'acc', 'tx.account_id = acc.id')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .leftJoin('categories', 'cat', 'tx.category_id = cat.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere("tx.status = 'CONFIRMED'")
      .andWhere('tx.exclude_from_report = false')
      .andWhere('tx.deleted_at IS NULL')
      .orderBy('tx.transaction_date', 'DESC')
      .limit(5);
    if (walletId) transactionQuery.andWhere('acc.wallet_id = :walletId', { walletId });

    const budgetAlertsQuery = this.dataSource
      .createQueryBuilder()
      .select('b.id', 'id')
      .addSelect('cat.name', 'categoryName')
      .addSelect('COALESCE(bp.limit_amount, b.limit_amount)', 'limitAmount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'spentAmount')
      .from('budgets', 'b')
      .innerJoin('wallets', 'w', 'b.wallet_id = w.id')
      .innerJoin('categories', 'cat', 'b.category_id = cat.id')
      .leftJoin(
        'budget_periods',
        'bp',
        'bp.budget_id = b.id AND bp.start_date <= :monthEnd AND bp.end_date >= :monthStart',
        {
          monthStart: `${month}-01`,
          monthEnd: (() => {
            const [year, monthNumber] = month.split('-').map(Number);
            return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
          })(),
        },
      )
      .leftJoin('accounts', 'acc', 'acc.wallet_id = w.id AND acc.deleted_at IS NULL')
      .leftJoin(
        'transactions',
        'tx',
        "tx.account_id = acc.id AND tx.category_id = b.category_id AND tx.type = 'EXPENSE' AND tx.status = 'CONFIRMED' AND tx.exclude_from_report = false AND tx.deleted_at IS NULL AND TO_CHAR(tx.transaction_date, 'YYYY-MM') = :month",
        { month },
      )
      .where('w.owner_id = :userId', { userId })
      .andWhere('b.deleted_at IS NULL')
      .groupBy('b.id')
      .addGroupBy('cat.name')
      .addGroupBy('bp.limit_amount')
      .addGroupBy('b.limit_amount')
      .having('COALESCE(SUM(tx.amount), 0) >= COALESCE(bp.limit_amount, b.limit_amount) * 0.8')
      .orderBy('SUM(tx.amount)', 'DESC');
    if (walletId) budgetAlertsQuery.andWhere('w.id = :walletId', { walletId });

    const recurringAlertsQuery = this.dataSource
      .createQueryBuilder()
      .select('rt.id', 'id')
      .addSelect('rt.name', 'name')
      .addSelect('rt.amount', 'amount')
      .from('recurring_transactions', 'rt')
      .innerJoin('wallets', 'w', 'rt.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere("rt.type = 'EXPENSE'")
      .andWhere('rt.is_paused = false')
      .andWhere('rt.deleted_at IS NULL')
      .andWhere('rt.next_run_date >= CURRENT_DATE')
      .andWhere("rt.next_run_date < CURRENT_DATE + INTERVAL '1 day'")
      .orderBy('rt.next_run_date', 'ASC');
    if (walletId) recurringAlertsQuery.andWhere('w.id = :walletId', { walletId });

    const [accounts, recentTransactions, budgetAlerts, recurringAlerts] = await Promise.all([
      accountsQuery.getRawMany(),
      transactionQuery.getRawMany(),
      budgetAlertsQuery.getRawMany(),
      recurringAlertsQuery.getRawMany(),
    ]);

    return {
      accounts,
      recentTransactions,
      budgetAlerts,
      recurringAlerts,
    };
  }

  async getCashFlowDetails(
    userId: string,
    walletId: string | undefined,
    startDate: string,
    endDate: string,
    datePart: string,
  ) {
    const timelineQuery = this.dataSource
      .createQueryBuilder()
      .select(`DATE_TRUNC(:datePart, tx.transaction_date)`, 'date')
      .addSelect("SUM(CASE WHEN tx.type = 'INCOME' THEN tx.amount ELSE 0 END)", 'income')
      .addSelect("SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END)", 'expense')
      .from('transactions', 'tx');

    this.applyUserWalletFilter(timelineQuery, userId, walletId);
    const baseFilters = (query: any) =>
      query
        .andWhere("tx.status = 'CONFIRMED'")
        .andWhere('tx.exclude_from_report = false')
        .andWhere('tx.deleted_at IS NULL')
        .andWhere('tx.transaction_date >= :startDate', { startDate })
        .andWhere('tx.transaction_date < :endDate', { endDate });

    const timeline = await baseFilters(timelineQuery)
      .setParameter('datePart', datePart)
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const heatmapQuery = this.dataSource
      .createQueryBuilder()
      .select('EXTRACT(ISODOW FROM tx.transaction_date)', 'dayOfWeek')
      .addSelect(
        'SUM(tx.amount) / NULLIF(COUNT(DISTINCT DATE(tx.transaction_date)), 0)',
        'averageExpense',
      )
      .from('transactions', 'tx');
    this.applyUserWalletFilter(heatmapQuery, userId, walletId);
    const dayOfWeekHeatmap = await baseFilters(heatmapQuery)
      .andWhere("tx.type = 'EXPENSE'")
      .groupBy('dayOfWeek')
      .orderBy('dayOfWeek', 'ASC')
      .getRawMany();

    const distributionQuery = this.dataSource
      .createQueryBuilder()
      .select("CASE WHEN EXTRACT(HOUR FROM tx.transaction_date) >= 6 AND EXTRACT(HOUR FROM tx.transaction_date) < 11 THEN 'morning' WHEN EXTRACT(HOUR FROM tx.transaction_date) >= 11 AND EXTRACT(HOUR FROM tx.transaction_date) < 14 THEN 'lunch' WHEN EXTRACT(HOUR FROM tx.transaction_date) >= 14 AND EXTRACT(HOUR FROM tx.transaction_date) < 18 THEN 'afternoon' ELSE 'evening' END", 'period')
      .addSelect('SUM(tx.amount)', 'amount')
      .from('transactions', 'tx');
    this.applyUserWalletFilter(distributionQuery, userId, walletId);
    const timeOfDayDistribution = await baseFilters(distributionQuery)
      .andWhere("tx.type = 'EXPENSE'")
      .groupBy('period')
      .getRawMany();

    return { timeline, dayOfWeekHeatmap, timeOfDayDistribution };
  }

  async getCategoryBreakdown(
    userId: string,
    walletId: string | undefined,
    type: string,
    month: string,
  ) {
    const categories = await this.dataSource
      .createQueryBuilder()
      .select('cat.id', 'id')
      .addSelect('cat.name', 'name')
      .addSelect('cat.icon', 'icon')
      .addSelect('cat.color', 'color')
      .addSelect('cat.parent_id', 'parentId')
      .addSelect('SUM(tx.amount)', 'amount')
      .from('transactions', 'tx')
      .innerJoin('accounts', 'acc', 'tx.account_id = acc.id')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .innerJoin('categories', 'cat', 'tx.category_id = cat.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere('tx.type = :type', { type })
      .andWhere("tx.status = 'CONFIRMED'")
      .andWhere('tx.exclude_from_report = false')
      .andWhere('tx.deleted_at IS NULL')
      .andWhere("TO_CHAR(tx.transaction_date, 'YYYY-MM') = :month", { month })
      .groupBy('cat.id')
      .addGroupBy('cat.name')
      .addGroupBy('cat.icon')
      .addGroupBy('cat.color')
      .addGroupBy('cat.parent_id')
      .orderBy('SUM(tx.amount)', 'DESC');

    if (walletId) categories.andWhere('acc.wallet_id = :walletId', { walletId });
    return categories.getRawMany();
  }

  async getTopSpendingItems(userId: string, walletId: string | undefined, month: string) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('tx.name', 'name')
      .addSelect('tx.amount', 'amount')
      .addSelect('cat.name', 'categoryName')
      .addSelect('tx.transaction_date', 'date')
      .from('transactions', 'tx')
      .innerJoin('accounts', 'acc', 'tx.account_id = acc.id')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .leftJoin('categories', 'cat', 'tx.category_id = cat.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere("tx.type = 'EXPENSE'")
      .andWhere("tx.status = 'CONFIRMED'")
      .andWhere('tx.exclude_from_report = false')
      .andWhere('tx.deleted_at IS NULL')
      .andWhere("TO_CHAR(tx.transaction_date, 'YYYY-MM') = :month", { month })
      .orderBy('tx.amount', 'DESC')
      .limit(5);

    if (walletId) query.andWhere('acc.wallet_id = :walletId', { walletId });
    return query.getRawMany();
  }

  async getBudgetHealth(userId: string, walletId: string | undefined, month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const startDate = `${month}-01`;
    const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const query = this.dataSource
      .createQueryBuilder()
      .select('b.id', 'budgetId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('cat.icon', 'icon')
      .addSelect('COALESCE(bp.limit_amount, b.limit_amount)', 'limitAmount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'spentAmount')
      .from('budgets', 'b')
      .innerJoin('wallets', 'w', 'b.wallet_id = w.id')
      .innerJoin('categories', 'cat', 'b.category_id = cat.id')
      .leftJoin(
        'budget_periods',
        'bp',
        'bp.budget_id = b.id AND bp.start_date <= :monthEnd AND bp.end_date >= :startDate',
        { startDate, monthEnd },
      )
      .leftJoin(
        'accounts',
        'acc',
        'acc.wallet_id = w.id AND acc.deleted_at IS NULL',
      )
      .leftJoin(
        'transactions',
        'tx',
        "tx.account_id = acc.id AND tx.category_id = b.category_id AND tx.type = 'EXPENSE' AND tx.status = 'CONFIRMED' AND tx.exclude_from_report = false AND tx.deleted_at IS NULL AND tx.transaction_date >= :startDate AND tx.transaction_date < :endDate",
        { startDate, endDate },
      )
      .where('w.owner_id = :userId', { userId })
      .andWhere('b.deleted_at IS NULL')
      .groupBy('b.id')
      .addGroupBy('cat.name')
      .addGroupBy('cat.icon')
      .addGroupBy('bp.limit_amount')
      .addGroupBy('b.limit_amount')
      .orderBy('cat.name', 'ASC');

    if (walletId) query.andWhere('w.id = :walletId', { walletId });
    return query.getRawMany();
  }

  async getDebtSummary(userId: string, walletId?: string) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('l.id', 'id')
      .addSelect('l.type', 'type')
      .addSelect('l.contact_name', 'counterpartyName')
      .addSelect('l.counterparty_user_id', 'counterpartyUserId')
      .addSelect('l.principal_amount', 'principalAmount')
      .addSelect('l.remaining_amount', 'remainingAmount')
      .addSelect('l.due_date', 'dueDate')
      .addSelect("COALESCE(SUM(lp.amount), 0)", 'paidAmount')
      .from('loans', 'l')
      .innerJoin('wallets', 'w', 'l.wallet_id = w.id')
      .leftJoin('loan_payments', 'lp', 'lp.loan_id = l.id AND lp.deleted_at IS NULL')
      .where('w.owner_id = :userId', { userId })
      .andWhere("l.status = 'ACTIVE'")
      .andWhere('l.deleted_at IS NULL')
      .groupBy('l.id')
      .addGroupBy('l.type')
      .addGroupBy('l.contact_name')
      .addGroupBy('l.counterparty_user_id')
      .addGroupBy('l.principal_amount')
      .addGroupBy('l.remaining_amount')
      .addGroupBy('l.due_date')
      .orderBy('l.due_date', 'ASC', 'NULLS LAST');

    if (walletId) query.andWhere('w.id = :walletId', { walletId });
    return query.getRawMany();
  }

  async getCalendarData(userId: string, walletId: string | undefined, month: string) {
    const transactionQuery = this.dataSource
      .createQueryBuilder()
      .select("DATE_TRUNC('day', tx.transaction_date)::date", 'date')
      .addSelect("SUM(CASE WHEN tx.type = 'INCOME' THEN tx.amount ELSE 0 END)", 'totalIncome')
      .addSelect("SUM(CASE WHEN tx.type = 'EXPENSE' THEN tx.amount ELSE 0 END)", 'totalExpense')
      .addSelect('COUNT(tx.id)', 'transactionCount')
      .addSelect('MAX(tx.photo_url)', 'highlightPhotoUrl')
      .from('transactions', 'tx');
    this.applyUserWalletFilter(transactionQuery, userId, walletId);
    const days = await transactionQuery
      .andWhere("tx.status = 'CONFIRMED'")
      .andWhere('tx.exclude_from_report = false')
      .andWhere('tx.deleted_at IS NULL')
      .andWhere("TO_CHAR(tx.transaction_date, 'YYYY-MM') = :month", { month })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const bills = await this.dataSource
      .createQueryBuilder()
      .select('rt.id', 'id')
      .addSelect('rt.name', 'name')
      .addSelect('rt.amount', 'amount')
      .addSelect('rt.next_run_date', 'nextRunDate')
      .addSelect('rt.frequency', 'frequency')
      .from('recurring_transactions', 'rt')
      .innerJoin('wallets', 'w', 'rt.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere("rt.type = 'EXPENSE'")
      .andWhere('rt.is_paused = false')
      .andWhere('rt.deleted_at IS NULL')
      .andWhere('rt.next_run_date >= CURRENT_DATE')
      .andWhere("rt.next_run_date < CURRENT_DATE + INTERVAL '30 days'")
      .orderBy('rt.next_run_date', 'ASC');
    if (walletId) bills.andWhere('w.id = :walletId', { walletId });

    const accountBalance = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(acc.balance), 0)', 'balance')
      .from('accounts', 'acc')
      .innerJoin('wallets', 'w', 'acc.wallet_id = w.id')
      .where('w.owner_id = :userId', { userId })
      .andWhere('acc.is_archived = false')
      .andWhere('acc.deleted_at IS NULL');
    if (walletId) accountBalance.andWhere('w.id = :walletId', { walletId });

    const [upcomingBills, balance] = await Promise.all([
      bills.getRawMany(),
      accountBalance.getRawOne(),
    ]);
    return { days, upcomingBills, accountBalance: Number(balance.balance || 0) };
  }

  async getSharedWalletContributions(walletId: string) {
    return this.dataSource
      .createQueryBuilder()
      .select('u.id', 'userId')
      .addSelect('u.full_name', 'fullName')
      .addSelect('u.avatar', 'avatar')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalPaid')
      .from('wallets', 'w')
      .leftJoin('accounts', 'acc', 'acc.wallet_id = w.id AND acc.deleted_at IS NULL')
      .leftJoin(
        'transactions',
        'tx',
        "tx.account_id = acc.id AND tx.type = 'EXPENSE' AND tx.status = 'CONFIRMED' AND tx.exclude_from_report = false AND tx.deleted_at IS NULL",
      )
      .leftJoin('users', 'u', 'u.id = tx.created_by')
      .where('w.id = :walletId', { walletId })
      .andWhere('w.is_shared = true')
      .groupBy('u.id')
      .addGroupBy('u.full_name')
      .addGroupBy('u.avatar')
      .getRawMany();
  }

  async getSharedWalletMembers(walletId: string) {
    return this.dataSource.query(
      `SELECT u.id AS "userId", u.full_name AS "fullName", u.avatar
       FROM wallets w
       INNER JOIN users u ON u.id = w.owner_id
       WHERE w.id = $1
       UNION
       SELECT u.id AS "userId", u.full_name AS "fullName", u.avatar
       FROM wallet_members wm
       INNER JOIN users u ON u.id = wm.user_id
       WHERE wm.wallet_id = $1 AND wm.status = 'ACCEPTED' AND wm.deleted_at IS NULL`,
      [walletId],
    );
  }

  async getSharedWallet(walletId: string) {
    return this.dataSource
      .createQueryBuilder()
      .select('w.id', 'id')
      .addSelect('w.name', 'name')
      .addSelect('w.default_currency', 'currency')
      .from('wallets', 'w')
      .where('w.id = :walletId', { walletId })
      .andWhere('w.is_shared = true')
      .getRawOne();
  }

  async getOperationsMetrics() {
    const [users, transactions] = await Promise.all([
      this.dataSource.query(
        "SELECT COUNT(*)::int AS total_users FROM users WHERE deleted_at IS NULL",
      ),
      this.dataSource.query(
        "SELECT COUNT(*)::int AS total_count, COUNT(*) FILTER (WHERE transaction_date >= CURRENT_DATE)::int AS daily_count, COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float AS volume FROM transactions WHERE status = 'CONFIRMED' AND deleted_at IS NULL",
      ),
    ]);
    return { totalUsers: Number(users[0].total_users), transactions: transactions[0] };
  }
}