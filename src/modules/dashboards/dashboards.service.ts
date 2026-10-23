import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboards.repository';
import { WalletsService } from '../wallets/wallets.service';
import { DashboardMapper } from './mapper/dashboards.mapper';
import { DashboardQueryDto } from './dto/request/dashboard-query.dto';
import { CashFlowQueryDto } from './dto/request/cash-flow-query.dto';
import { CategoryBreakdownQueryDto } from './dto/request/category-breakdown-query.dto';
import { DashboardMonthQueryDto } from './dto/request/dashboard-month-query.dto';
import { CashFlowPeriod, CategoryBreakdownType } from './dashboards.constant';
import { DashboardWalletAccessDeniedException } from './exceptions/dashboards.exception';
import { OverviewDashboardResponseDto } from './dto/response/overview-dashboard-response.dto';
import { CashFlowResponseDto } from './dto/response/cash-flow-response.dto';
import { CategoryBreakdownResponseDto, Rule503020EvaluationDto } from './dto/response/category-breakdown-response.dto';
import { BudgetHealthResponseDto } from './dto/response/budget-health-response.dto';
import { DebtsDashboardResponseDto } from './dto/response/debts-dashboard-response.dto';
import { CalendarDashboardResponseDto } from './dto/response/calendar-dashboard-response.dto';
import { SharedWalletDashboardResponseDto } from './dto/response/shared-wallet-dashboard-response.dto';
import { OperationsDashboardResponseDto } from './dto/response/operations-dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly walletsService: WalletsService,
    private readonly mapper: DashboardMapper,
  ) {}

  private async validateWalletAccess(userId: string, walletId?: string): Promise<void> {
    if (walletId) {
      const userWalletIds = await this.walletsService.getUserWalletIds(userId);
      if (!userWalletIds.includes(walletId)) {
        throw new DashboardWalletAccessDeniedException(walletId);
      }
    }
  }

  async getExecutiveOverview(userId: string, query: DashboardQueryDto): Promise<OverviewDashboardResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);

    const netWorth = await this.dashboardRepo.calculateNetWorth(userId, query.walletId);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = currentMonth.split('-').map(Number);
    const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
    const monthlyCashflow = await this.dashboardRepo.getMonthlyCashflow(userId, currentMonth, query.walletId);
    const [previousCashflow, details] = await Promise.all([
      this.dashboardRepo.getMonthlyCashflow(userId, previousMonth, query.walletId),
      this.dashboardRepo.getOverviewDetails(userId, query.walletId, currentMonth),
    ]);

    const netCashflow = monthlyCashflow.income - monthlyCashflow.expense;
    const savingsRate = monthlyCashflow.income > 0 ? (netCashflow / monthlyCashflow.income) * 100 : 0;
    const changePercentage = (current: number, previous: number) => previous > 0
      ? Number(((current - previous) / previous * 100).toFixed(1))
      : current > 0 ? 100 : 0;
    const activeAlerts = [
      ...details.budgetAlerts.map((alert: any) => ({
        type: 'BUDGET_WARNING',
        severity: Number(alert.spentAmount) >= Number(alert.limitAmount) ? 'HIGH' : 'MEDIUM',
        message: `Danh mục '${alert.categoryName}' đã sử dụng ${Math.round(Number(alert.spentAmount) / Number(alert.limitAmount) * 100)}% ngân sách tháng`,
        relatedEntityId: alert.id,
      })),
      ...details.recurringAlerts.map((alert: any) => ({
        type: 'RECURRING_DUE_TODAY',
        severity: 'MEDIUM',
        message: `${alert.name} (${Number(alert.amount).toLocaleString('vi-VN')} đ) đến hạn hôm nay`,
        relatedEntityId: alert.id,
      })),
    ];

    return this.mapper.toOverviewResponse({
      netWorth,
      currency: 'VND',
      assetTier: {
        tier: netWorth >= 200000000 ? 'DIAMOND' : netWorth >= 100000000 ? 'GOLD' : 'SILVER',
        title: netWorth >= 100000000 ? 'Nhà Tích Lũy Vàng' : 'Tích Lũy Viên',
        mascotMood: 'HAPPY',
        nextTierThreshold: 200000000,
      },
      monthlyCashflow: {
        month: currentMonth,
        income: monthlyCashflow.income,
        expense: monthlyCashflow.expense,
        netCashflow,
        savingsRate: Number(savingsRate.toFixed(1)),
        momIncomeChange: changePercentage(monthlyCashflow.income, previousCashflow.income),
        momExpenseChange: changePercentage(monthlyCashflow.expense, previousCashflow.expense),
      },
      accountsSummary: details.accounts.map((account: any) => ({
        ...account,
        balance: Number(account.balance),
        isExcludedFromNetWorth: Boolean(account.isExcludedFromNetWorth),
      })),
      activeAlerts,
      recentTransactions: details.recentTransactions.map((transaction: any) => ({
        ...transaction,
        amount: Number(transaction.amount),
        transactionDate: new Date(transaction.transactionDate).toISOString(),
      })),
    });
  }

  async getCashFlow(userId: string, query: CashFlowQueryDto): Promise<CashFlowResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);
    const now = new Date();
    const endDate = query.endDate
      ? new Date(`${query.endDate}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    if (query.endDate) endDate.setUTCDate(endDate.getUTCDate() + 1);
    const startDate = query.startDate
      ? new Date(`${query.startDate}T00:00:00.000Z`)
      : this.getPeriodStart(query.period ?? CashFlowPeriod.MONTH, now);
    const datePart = query.startDate || query.endDate
      ? 'day'
      : query.period === CashFlowPeriod.WEEK
        ? 'day'
        : query.period === CashFlowPeriod.YEAR
          ? 'month'
          : query.period === CashFlowPeriod.QUARTER
            ? 'month'
            : 'week';
    const details = await this.dashboardRepo.getCashFlowDetails(
      userId,
      query.walletId,
      startDate.toISOString(),
      endDate.toISOString(),
      datePart,
    );
    const timeline = details.timeline.map((row: any, index: number) => {
      const income = Number(row.income || 0);
      const expense = Number(row.expense || 0);
      const date = new Date(row.date);
      return {
        dateLabel: datePart === 'week'
          ? `Tuần ${index + 1}`
          : date.toISOString().slice(0, datePart === 'day' ? 10 : 7),
        income,
        expense,
        net: income - expense,
      };
    });
    const totalIncome = timeline.reduce((sum: number, item: any) => sum + item.income, 0);
    const totalExpense = timeline.reduce((sum: number, item: any) => sum + item.expense, 0);
    const totalByPeriod = details.timeOfDayDistribution.reduce(
      (sum: number, row: any) => sum + Number(row.amount || 0),
      0,
    );
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    return this.mapper.toCashFlowResponse({
      period: query.period ?? CashFlowPeriod.MONTH,
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      timeline,
      dayOfWeekHeatmap: details.dayOfWeekHeatmap.map((row: any) => ({
        dayOfWeek: dayNames[Number(row.dayOfWeek) - 1] ?? `Thứ ${row.dayOfWeek}`,
        averageExpense: Number(row.averageExpense || 0),
      })),
      timeOfDayDistribution: Object.fromEntries(
        ['morning', 'lunch', 'afternoon', 'evening'].map((period) => {
          const row = details.timeOfDayDistribution.find((item: any) => item.period === period);
          const amount = Number(row?.amount || 0);
          const labels: Record<string, string> = {
            morning: 'Sáng (06h - 11h)',
            lunch: 'Trưa (11h - 14h)',
            afternoon: 'Chiều (14h - 18h)',
            evening: 'Tối & Đêm (18h - 06h)',
          };
          return [period, {
            label: labels[period],
            amount,
            percentage: totalByPeriod > 0 ? Number((amount / totalByPeriod * 100).toFixed(1)) : 0,
          }];
        }),
      ),
    });
  }

  async getCategoryBreakdown(userId: string, query: CategoryBreakdownQueryDto): Promise<CategoryBreakdownResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);
    const month = query.month ?? new Date().toISOString().slice(0, 7);
    const breakdownType = query.type ?? CategoryBreakdownType.EXPENSE;
    const rows = await this.dashboardRepo.getCategoryBreakdown(
      userId,
      query.walletId,
      breakdownType,
      month,
    );
    const topSpendingItems = breakdownType === CategoryBreakdownType.INCOME
      ? []
      : await this.dashboardRepo.getTopSpendingItems(userId, query.walletId, month);
    const totalAmount = rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const children = new Map<string, any[]>();
    for (const row of rows) {
      if (row.parentId) {
        const items = children.get(row.parentId) ?? [];
        items.push(row);
        children.set(row.parentId, items);
      }
    }

    const categories = rows
      .filter((row: any) => !row.parentId)
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        amount: Number(row.amount || 0),
        percentage: totalAmount > 0
          ? Number((Number(row.amount) / totalAmount * 100).toFixed(2))
          : 0,
        subCategories: (children.get(row.id) ?? []).map((child: any) => ({
          id: child.id,
          name: child.name,
          amount: Number(child.amount || 0),
          percentage: totalAmount > 0
            ? Number((Number(child.amount) / totalAmount * 100).toFixed(2))
            : 0,
        })),
      }));

    const rule503020Evaluation = breakdownType === CategoryBreakdownType.EXPENSE
      ? this.evaluateRule503020(categories, totalAmount)
      : null;

    return this.mapper.toCategoryBreakdownResponse({
      month,
      type: breakdownType,
      totalAmount,
      currency: 'VND',
      rule503020Evaluation,
      categories,
      topSpendingItems: topSpendingItems.map((item: any) => ({
        ...item,
        amount: Number(item.amount),
        date: new Date(item.date).toISOString().slice(0, 10),
      })),
    });
  }

  private evaluateRule503020(categories: any[], totalExpense: number): Rule503020EvaluationDto | null {
    if (totalExpense <= 0) return null;

    const needsKeywords = [
      'ăn', 'uống', 'chợ', 'siêu thị', 'nhà', 'điện', 'nước', 'tiện ích',
      'xăng', 'xe', 'học', 'y tế', 'thuốc', 'nhu cầu', 'thiết yếu',
      'food', 'grocer', 'rent', 'utilit', 'health', 'medic', 'educat', 'transport',
    ];
    const savingsKeywords = [
      'tiết kiệm', 'đầu tư', 'nợ', 'trả nợ', 'bảo hiểm',
      'saving', 'invest', 'debt', 'loan', 'insur',
    ];

    let needsAmount = 0;
    let savingsAmount = 0;
    let wantsAmount = 0;

    for (const cat of categories) {
      const name = (cat.name || '').toLowerCase();
      const amount = Number(cat.amount || 0);

      if (savingsKeywords.some((kw) => name.includes(kw))) {
        savingsAmount += amount;
      } else if (needsKeywords.some((kw) => name.includes(kw))) {
        needsAmount += amount;
      } else {
        wantsAmount += amount;
      }
    }

    const needsPct = Number(((needsAmount / totalExpense) * 100).toFixed(1));
    const wantsPct = Number(((wantsAmount / totalExpense) * 100).toFixed(1));
    const savingsPct = Number(((savingsAmount / totalExpense) * 100).toFixed(1));

    const getStatus = (actual: number, target: number, isMinTarget = false) => {
      if (isMinTarget) {
        if (actual >= target * 0.9) return 'OPTIMAL';
        if (actual >= target * 0.5) return 'SLIGHT_OVER';
        return 'NEEDS_IMPROVEMENT';
      }
      if (actual <= target * 1.05) return 'OPTIMAL';
      if (actual <= target * 1.2) return 'SLIGHT_OVER';
      return 'NEEDS_IMPROVEMENT';
    };

    return {
      needs: {
        amount: Math.round(needsAmount),
        percentage: needsPct,
        targetPercentage: 50.0,
        status: getStatus(needsPct, 50.0),
      },
      wants: {
        amount: Math.round(wantsAmount),
        percentage: wantsPct,
        targetPercentage: 30.0,
        status: getStatus(wantsPct, 30.0),
      },
      savings: {
        amount: Math.round(savingsAmount),
        percentage: savingsPct,
        targetPercentage: 20.0,
        status: getStatus(savingsPct, 20.0, true),
      },
    };
  }

  async getBudgetHealth(userId: string, query: DashboardMonthQueryDto): Promise<BudgetHealthResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);
    const month = query.month ?? new Date().toISOString().slice(0, 7);
    const rows = await this.dashboardRepo.getBudgetHealth(userId, query.walletId, month);
    const categoryBudgets = rows.map((row: any) => {
      const limitAmount = Number(row.limitAmount || 0);
      const spentAmount = Number(row.spentAmount || 0);
      const spentPercentage = limitAmount > 0 ? spentAmount / limitAmount * 100 : 0;
      return {
        budgetId: row.budgetId,
        categoryName: row.categoryName,
        icon: row.icon,
        limitAmount,
        spentAmount,
        remainingAmount: limitAmount - spentAmount,
        spentPercentage: Number(spentPercentage.toFixed(1)),
        status: spentPercentage >= 100 ? 'EXCEEDED' : spentPercentage >= 80 ? 'WARNING' : 'GOOD',
        colorStatus: spentPercentage >= 100 ? 'RED' : spentPercentage >= 80 ? 'ORANGE' : 'GREEN',
      };
    });
    const totalBudgetLimit = categoryBudgets.reduce((sum: number, item: any) => sum + item.limitAmount, 0);
    const totalSpent = categoryBudgets.reduce((sum: number, item: any) => sum + item.spentAmount, 0);
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const today = new Date();
    const isCurrentMonth = today.getUTCFullYear() === year && today.getUTCMonth() + 1 === monthNumber;
    const daysPassed = isCurrentMonth ? today.getUTCDate() : daysInMonth;
    const daysRemaining = isCurrentMonth ? daysInMonth - daysPassed : 0;
    const actualDailyBurnRate = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const recommendedDailyBurnRate = daysRemaining > 0
      ? Math.max(totalBudgetLimit - totalSpent, 0) / daysRemaining
      : 0;
    const projectedMonthEndExpense = actualDailyBurnRate * daysInMonth;
    const runwayDays = actualDailyBurnRate > 0 ? Math.ceil(Math.max(totalBudgetLimit - totalSpent, 0) / actualDailyBurnRate) : null;
    const runwayDate = runwayDays === null ? null : new Date(Date.UTC(year, monthNumber - 1, daysPassed + runwayDays)).toISOString().slice(0, 10);

    return this.mapper.toBudgetHealthResponse({
      month,
      daysPassed,
      daysRemaining,
      totalBudgetLimit,
      totalSpent,
      remainingBudget: totalBudgetLimit - totalSpent,
      spentPercentage: totalBudgetLimit > 0 ? Number((totalSpent / totalBudgetLimit * 100).toFixed(1)) : 0,
      burnRateMetrics: {
        actualDailyBurnRate: Math.round(actualDailyBurnRate),
        recommendedDailyBurnRate: Math.round(recommendedDailyBurnRate),
        projectedMonthEndExpense: Math.round(projectedMonthEndExpense),
        projectedRunwayDate: runwayDate,
        willOverspend: projectedMonthEndExpense > totalBudgetLimit,
        estimatedOverspendAmount: Math.max(Math.round(projectedMonthEndExpense - totalBudgetLimit), 0),
      },
      categoryBudgets,
    });
  }

  async getDebts(userId: string, query: DashboardQueryDto): Promise<DebtsDashboardResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);
    const [loans, netWorth] = await Promise.all([
      this.dashboardRepo.getDebtSummary(userId, query.walletId),
      this.dashboardRepo.calculateNetWorth(userId, query.walletId),
    ]);
    const totalReceivables = loans
      .filter((loan: any) => loan.type === 'LENT')
      .reduce((sum: number, loan: any) => sum + Number(loan.remainingAmount), 0);
    const totalPayables = loans
      .filter((loan: any) => loan.type === 'BORROWED' || loan.type === 'INSTALLMENT')
      .reduce((sum: number, loan: any) => sum + Number(loan.remainingAmount), 0);
    const now = new Date();
    const overdue = loans.filter((loan: any) => loan.dueDate && new Date(loan.dueDate) < now);
    const overdueReceivables = overdue.filter((loan: any) => loan.type === 'LENT');
    const overduePayables = overdue.filter(
      (loan: any) => loan.type === 'BORROWED' || loan.type === 'INSTALLMENT',
    );

    return this.mapper.toDebtsResponse({
      totalReceivables,
      totalPayables,
      netDebtPosition: totalReceivables - totalPayables,
      debtToAssetRatio: netWorth > 0 ? Number((totalPayables / netWorth * 100).toFixed(2)) : 0,
      overdueStats: {
        overdueReceivableCount: overdueReceivables.length,
        overdueReceivableAmount: overdueReceivables.reduce((sum: number, loan: any) => sum + Number(loan.remainingAmount), 0),
        overduePayableCount: overduePayables.length,
        overduePayableAmount: overduePayables.reduce((sum: number, loan: any) => sum + Number(loan.remainingAmount), 0),
      },
      topDebtors: loans.map((loan: any) => ({
        counterpartyName: loan.counterpartyName,
        counterpartyUserId: loan.counterpartyUserId,
        type: loan.type,
        remainingAmount: Number(loan.remainingAmount),
        dueDate: loan.dueDate ? new Date(loan.dueDate).toISOString().slice(0, 10) : null,
        isOverdue: Boolean(loan.dueDate && new Date(loan.dueDate) < now),
        daysOverdue: loan.dueDate && new Date(loan.dueDate) < now
          ? Math.floor((now.getTime() - new Date(loan.dueDate).getTime()) / 86400000)
          : 0,
      })),
      installments: loans
        .filter((loan: any) => loan.type === 'INSTALLMENT')
        .map((loan: any) => ({
          loanId: loan.id,
          counterpartyName: loan.contactName,
          totalPrincipal: Number(loan.principalAmount),
          paidAmount: Number(loan.paidAmount),
          remainingAmount: Number(loan.remainingAmount),
          progressPercentage: Number(loan.principalAmount) > 0
            ? Number(((Number(loan.principalAmount) - Number(loan.remainingAmount)) / Number(loan.principalAmount) * 100).toFixed(1))
            : 0,
          nextDueDate: loan.dueDate ? new Date(loan.dueDate).toISOString().slice(0, 10) : null,
        })),
    });
  }

  async getCalendar(userId: string, query: DashboardMonthQueryDto): Promise<CalendarDashboardResponseDto> {
    await this.validateWalletAccess(userId, query.walletId);
    const month = query.month ?? new Date().toISOString().slice(0, 7);
    const { days, upcomingBills, accountBalance } = await this.dashboardRepo.getCalendarData(
      userId,
      query.walletId,
      month,
    );
    const averageDailyExpense = days.length > 0
      ? days.reduce((sum: number, day: any) => sum + Number(day.totalExpense || 0), 0) / days.length
      : 0;
    const totalUpcoming30Days = upcomingBills.reduce(
      (sum: number, bill: any) => sum + Number(bill.amount || 0),
      0,
    );

    return this.mapper.toCalendarResponse({
      month,
      days: days.map((day: any) => ({
        ...day,
        totalIncome: Number(day.totalIncome || 0),
        totalExpense: Number(day.totalExpense || 0),
        transactionCount: Number(day.transactionCount || 0),
        hasSpikeExpense: averageDailyExpense > 0 && Number(day.totalExpense || 0) >= averageDailyExpense * 2,
      })),
      upcomingBillsSummary: {
        totalUpcoming30Days,
        projectedDisposableCash: accountBalance - totalUpcoming30Days,
        bills: upcomingBills.map((bill: any) => ({
          ...bill,
          amount: Number(bill.amount),
          nextRunDate: new Date(bill.nextRunDate).toISOString().slice(0, 10),
          daysRemaining: Math.max(0, Math.ceil((new Date(bill.nextRunDate).getTime() - Date.now()) / 86400000)),
        })),
      },
    });
  }

  async getSharedWalletDashboard(userId: string, walletId: string): Promise<SharedWalletDashboardResponseDto> {
    await this.walletsService.assertWalletAccess(walletId, userId, 'read');
    const wallet = await this.dashboardRepo.getSharedWallet(walletId);
    if (!wallet) throw new DashboardWalletAccessDeniedException(walletId);
    const [rows, members] = await Promise.all([
      this.dashboardRepo.getSharedWalletContributions(walletId),
      this.dashboardRepo.getSharedWalletMembers(walletId),
    ]);
    const payments = new Map(rows.map((row: any) => [row.userId, Number(row.totalPaid || 0)]));
    const totalSpent = rows.reduce((sum: number, row: any) => sum + Number(row.totalPaid || 0), 0);
    const memberContributions = members.map((member: any) => {
      const totalPaid = payments.get(member.userId) ?? 0;
      return {
        userId: member.userId,
        fullName: member.fullName,
        avatar: member.avatar,
        totalPaid,
        percentage: totalSpent > 0 ? Number((totalPaid / totalSpent * 100).toFixed(2)) : 0,
      };
    });
    const targetPerMember = memberContributions.length > 0
      ? totalSpent / memberContributions.length
      : 0;
    const creditors = memberContributions
      .map((member: any) => ({ ...member, balance: member.totalPaid - targetPerMember }))
      .filter((member: any) => member.balance > 0.5);
    const debtors = memberContributions
      .map((member: any) => ({ ...member, balance: targetPerMember - member.totalPaid }))
      .filter((member: any) => member.balance > 0.5);
    const suggestedSettlements = [];
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const amount = Math.min(creditors[creditorIndex].balance, debtors[debtorIndex].balance);
      suggestedSettlements.push({
        fromUserId: debtors[debtorIndex].userId,
        fromUserName: debtors[debtorIndex].fullName,
        toUserId: creditors[creditorIndex].userId,
        toUserName: creditors[creditorIndex].fullName,
        amount: Math.round(amount),
        reason: 'Cân bằng chi phí ví chung theo phần đóng góp bình quân',
      });
      creditors[creditorIndex].balance -= amount;
      debtors[debtorIndex].balance -= amount;
      if (creditors[creditorIndex].balance <= 0.5) creditorIndex++;
      if (debtors[debtorIndex].balance <= 0.5) debtorIndex++;
    }

    return this.mapper.toSharedWalletResponse({
      walletId: wallet.id,
      walletName: wallet.name,
      totalSpent,
      currency: wallet.currency,
      memberContributions,
      settlementMatrix: {
        isBalanced: suggestedSettlements.length === 0,
        suggestedSettlements,
      },
    });
  }

  async getOperationsDashboard(): Promise<OperationsDashboardResponseDto> {
    const metrics = await this.dashboardRepo.getOperationsMetrics();
    return this.mapper.toOperationsResponse({
      userGrowth: {
        totalUsers: metrics.totalUsers,
        dau: null,
        mau: null,
        weeklyRetentionRate: null,
      },
      platformMetrics: {
        totalTransactionsCount: Number(metrics.transactions.total_count),
        dailyTransactionsCount: Number(metrics.transactions.daily_count),
        grossMerchandiseVolume: Number(metrics.transactions.volume),
      },
      aiClassifierPerformance: null,
      systemHealth: null,
    });
  }

  private getPeriodStart(period: CashFlowPeriod, now: Date): Date {
    if (period === CashFlowPeriod.WEEK) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
      return start;
    }
    if (period === CashFlowPeriod.QUARTER) {
      return new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
    }
    if (period === CashFlowPeriod.YEAR) {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  async getSpendingSummaryByRange(
    userId: string,
    walletId: string | undefined,
    from: string,
    to: string,
  ) {
    await this.validateWalletAccess(userId, walletId);
    return this.dashboardRepo.getSpendingSummaryByRange(
      userId,
      walletId,
      from,
      to,
    );
  }

  async getRecentTransactions(
    userId: string,
    walletId: string | undefined,
    limit = 5,
  ) {
    await this.validateWalletAccess(userId, walletId);
    return this.dashboardRepo.getRecentTransactions(userId, walletId, limit);
  }
}