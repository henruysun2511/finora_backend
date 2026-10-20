import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardMapper {
  toOverviewResponse(data: {
    netWorth: number;
    currency: string;
    income: number;
    expense: number;
    month: string;
  }) {
    const netCashflow = data.income - data.expense;
    const savingsRate = data.income > 0 ? (netCashflow / data.income) * 100 : 0;

    return {
      netWorth: data.netWorth,
      currency: data.currency,
      assetTier: {
        tier: data.netWorth >= 200000000 ? 'DIAMOND' : data.netWorth >= 100000000 ? 'GOLD' : 'SILVER',
        title: data.netWorth >= 100000000 ? 'Nhà Tích Lũy Vàng' : 'Tích Lũy Viên',
        mascotMood: 'HAPPY',
        nextTierThreshold: 200000000,
      },
      monthlyCashflow: {
        month: data.month,
        income: data.income,
        expense: data.expense,
        netCashflow,
        savingsRate: Number(savingsRate.toFixed(1)),
        momIncomeChange: 0,
        momExpenseChange: 0,
      },
      accountsSummary: [],
      activeAlerts: [],
      recentTransactions: [],
    };
  }
}