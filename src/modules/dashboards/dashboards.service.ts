import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboards.repository';
import { WalletsService } from '../wallets/wallets.service';
import { DashboardQueryDto } from './dto/request/dashboard-query.dto';
import { DashboardWalletAccessDeniedException } from './exceptions/dashboards.exception';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly walletsService: WalletsService,
  ) {}

  private async validateWalletAccess(userId: string, walletId?: string): Promise<void> {
    if (walletId) {
      const userWalletIds = await this.walletsService.getUserWalletIds(userId);
      if (!userWalletIds.includes(walletId)) {
        throw new DashboardWalletAccessDeniedException(walletId);
      }
    }
  }

  async getExecutiveOverview(userId: string, query: DashboardQueryDto) {
    await this.validateWalletAccess(userId, query.walletId);

    const netWorth = await this.dashboardRepo.calculateNetWorth(userId, query.walletId);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyCashflow = await this.dashboardRepo.getMonthlyCashflow(userId, currentMonth, query.walletId);

    const netCashflow = monthlyCashflow.income - monthlyCashflow.expense;
    const savingsRate = monthlyCashflow.income > 0 ? (netCashflow / monthlyCashflow.income) * 100 : 0;

    return {
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
        momIncomeChange: 0,
        momExpenseChange: 0,
      },
      accountsSummary: [],
      activeAlerts: [],
      recentTransactions: [],
    };
  }
}