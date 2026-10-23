import { Injectable } from '@nestjs/common';
import { OverviewDashboardResponseDto } from '../dto/response/overview-dashboard-response.dto';
import { CashFlowResponseDto } from '../dto/response/cash-flow-response.dto';
import { CategoryBreakdownResponseDto } from '../dto/response/category-breakdown-response.dto';
import { BudgetHealthResponseDto } from '../dto/response/budget-health-response.dto';
import { DebtsDashboardResponseDto } from '../dto/response/debts-dashboard-response.dto';
import { CalendarDashboardResponseDto } from '../dto/response/calendar-dashboard-response.dto';
import { SharedWalletDashboardResponseDto } from '../dto/response/shared-wallet-dashboard-response.dto';
import { OperationsDashboardResponseDto } from '../dto/response/operations-dashboard-response.dto';

@Injectable()
export class DashboardMapper {
  toOverviewResponse(data: {
    netWorth: number;
    currency: string;
    assetTier: any;
    monthlyCashflow: any;
    accountsSummary: any[];
    activeAlerts: any[];
    recentTransactions: any[];
  }): OverviewDashboardResponseDto {
    return {
      netWorth: data.netWorth,
      currency: data.currency,
      assetTier: data.assetTier,
      monthlyCashflow: data.monthlyCashflow,
      accountsSummary: data.accountsSummary,
      activeAlerts: data.activeAlerts,
      recentTransactions: data.recentTransactions,
    };
  }

  toCashFlowResponse(data: any): CashFlowResponseDto {
    return {
      period: data.period,
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      netSavings: data.netSavings,
      timeline: data.timeline,
      dayOfWeekHeatmap: data.dayOfWeekHeatmap,
      timeOfDayDistribution: data.timeOfDayDistribution,
    };
  }

  toCategoryBreakdownResponse(data: any): CategoryBreakdownResponseDto {
    return {
      month: data.month,
      type: data.type,
      totalAmount: data.totalAmount,
      currency: data.currency,
      rule503020Evaluation: data.rule503020Evaluation,
      categories: data.categories,
      topSpendingItems: data.topSpendingItems,
    };
  }

  toBudgetHealthResponse(data: any): BudgetHealthResponseDto {
    return {
      month: data.month,
      daysPassed: data.daysPassed,
      daysRemaining: data.daysRemaining,
      totalBudgetLimit: data.totalBudgetLimit,
      totalSpent: data.totalSpent,
      remainingBudget: data.remainingBudget,
      spentPercentage: data.spentPercentage,
      burnRateMetrics: data.burnRateMetrics,
      categoryBudgets: data.categoryBudgets,
    };
  }

  toDebtsResponse(data: any): DebtsDashboardResponseDto {
    return {
      totalReceivables: data.totalReceivables,
      totalPayables: data.totalPayables,
      netDebtPosition: data.netDebtPosition,
      debtToAssetRatio: data.debtToAssetRatio,
      overdueStats: data.overdueStats,
      topDebtors: data.topDebtors,
      installments: data.installments,
    };
  }

  toCalendarResponse(data: any): CalendarDashboardResponseDto {
    return {
      month: data.month,
      days: data.days,
      upcomingBillsSummary: data.upcomingBillsSummary,
    };
  }

  toSharedWalletResponse(data: any): SharedWalletDashboardResponseDto {
    return {
      walletId: data.walletId,
      walletName: data.walletName,
      totalSpent: data.totalSpent,
      currency: data.currency,
      memberContributions: data.memberContributions,
      settlementMatrix: data.settlementMatrix,
    };
  }

  toOperationsResponse(data: any): OperationsDashboardResponseDto {
    return {
      userGrowth: data.userGrowth,
      platformMetrics: data.platformMetrics,
      aiClassifierPerformance: data.aiClassifierPerformance,
      systemHealth: data.systemHealth,
    };
  }
}