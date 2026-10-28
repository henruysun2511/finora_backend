import { Injectable } from '@nestjs/common';
import {
  DailyAllowanceDto,
  PacingMetricsDto,
  SpendingBudgetSummaryDto,
  SpendingInsightDto,
  SpendingPaceResponseDto,
  SpendingTimelineDto,
} from '../dto/response/spending-pace-response.dto';
import { TodaySpendingGuideResponseDto } from '../dto/response/today-spending-guide-response.dto';
import { PacingSeverity, PacingStatus } from '../financial-insights.constant';

@Injectable()
export class FinancialInsightsMapper {
  toTimeline(params: {
    startDate: Date;
    endDate: Date;
    targetDate: Date;
    totalDays: number;
    daysPassed: number;
    daysRemaining: number;
    timeElapsedPercentage: number;
  }): SpendingTimelineDto {
    return {
      startDate: params.startDate.toISOString().slice(0, 10),
      endDate: params.endDate.toISOString().slice(0, 10),
      totalDays: params.totalDays,
      daysPassed: params.daysPassed,
      daysRemaining: params.daysRemaining,
      timeElapsedPercentage: params.timeElapsedPercentage,
    };
  }

  toBudgetSummary(params: {
    hasBudget: boolean;
    totalLimit: number;
    totalSpent: number;
    remainingAmount: number;
    spentPercentage: number;
  }): SpendingBudgetSummaryDto {
    return {
      hasBudget: params.hasBudget,
      totalLimit: params.totalLimit,
      totalSpent: params.totalSpent,
      remainingAmount: params.remainingAmount,
      spentPercentage: params.spentPercentage,
    };
  }

  toDailyAllowance(params: {
    initialDailyBudget: number;
    actualDailySpentAvg: number;
    recommendedDailyLimit: number;
    spentToday: number;
    remainingToday: number;
  }): DailyAllowanceDto {
    return {
      initialDailyBudget: params.initialDailyBudget,
      actualDailySpentAvg: params.actualDailySpentAvg,
      recommendedDailyLimit: params.recommendedDailyLimit,
      spentToday: params.spentToday,
      remainingToday: params.remainingToday,
    };
  }

  toPacingMetrics(params: {
    status: PacingStatus;
    burnRateMultiplier: number;
    projectedMonthEndExpense: number;
    estimatedOverspendAmount: number;
  }): PacingMetricsDto {
    return {
      status: params.status,
      burnRateMultiplier: params.burnRateMultiplier,
      projectedMonthEndExpense: params.projectedMonthEndExpense,
      estimatedOverspendAmount: params.estimatedOverspendAmount,
    };
  }

  toInsight(params: {
    severity: PacingSeverity;
    badge: string;
    headline: string;
    subheadline: string;
    advice: string;
    aiAdvice?: string | null;
    isAiGenerated?: boolean;
  }): SpendingInsightDto {
    return {
      severity: params.severity,
      badge: params.badge,
      headline: params.headline,
      subheadline: params.subheadline,
      advice: params.advice,
      aiAdvice: params.aiAdvice ?? null,
      isAiGenerated: params.isAiGenerated ?? false,
    };
  }

  toPaceResponse(params: {
    walletId: string | null;
    walletName: string;
    currency: string;
    timeline: SpendingTimelineDto;
    budget: SpendingBudgetSummaryDto;
    dailyAllowance: DailyAllowanceDto;
    pacing: PacingMetricsDto;
    insight: SpendingInsightDto;
  }): SpendingPaceResponseDto {
    return {
      walletId: params.walletId,
      walletName: params.walletName,
      currency: params.currency,
      timeline: params.timeline,
      budget: params.budget,
      dailyAllowance: params.dailyAllowance,
      pacing: params.pacing,
      insight: params.insight,
    };
  }

  toTodayGuideResponse(params: {
    date: string;
    daysRemaining: number;
    safeToSpendToday: number;
    spentToday: number;
    remainingToday: number;
    remainingMonthBudget: number;
    currency: string;
    pacingStatus: PacingStatus;
    severity: PacingSeverity;
    advice: string;
    aiAdvice?: string | null;
    isAiGenerated?: boolean;
  }): TodaySpendingGuideResponseDto {
    return {
      date: params.date,
      daysRemaining: params.daysRemaining,
      safeToSpendToday: params.safeToSpendToday,
      spentToday: params.spentToday,
      remainingToday: params.remainingToday,
      remainingMonthBudget: params.remainingMonthBudget,
      currency: params.currency,
      pacingStatus: params.pacingStatus,
      severity: params.severity,
      advice: params.advice,
      aiAdvice: params.aiAdvice ?? null,
      isAiGenerated: params.isAiGenerated ?? false,
    };
  }

  toEmptyResponse(queryDate?: string): SpendingPaceResponseDto {
    const targetDate = queryDate ? new Date(queryDate) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    return {
      walletId: null,
      walletName: 'Chưa có ví',
      currency: 'VND',
      timeline: {
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: endOfMonth.toISOString().slice(0, 10),
        totalDays: endOfMonth.getDate(),
        daysPassed: targetDate.getDate(),
        daysRemaining: endOfMonth.getDate() - targetDate.getDate() + 1,
        timeElapsedPercentage: 0,
      },
      budget: {
        hasBudget: false,
        totalLimit: 0,
        totalSpent: 0,
        remainingAmount: 0,
        spentPercentage: 0,
      },
      dailyAllowance: {
        initialDailyBudget: 0,
        actualDailySpentAvg: 0,
        recommendedDailyLimit: 0,
        spentToday: 0,
        remainingToday: 0,
      },
      pacing: {
        status: PacingStatus.NO_BUDGET,
        burnRateMultiplier: 0,
        projectedMonthEndExpense: 0,
        estimatedOverspendAmount: 0,
      },
      insight: {
        severity: PacingSeverity.INFO,
        badge: 'Chưa có ví 💡',
        headline: 'Bạn chưa tạo ví tài chính nào.',
        subheadline: 'Số dư hiện tại: 0₫.',
        advice:
          'Hãy tạo ví tài chính đầu tiên để bắt đầu theo dõi tiến độ chi tiêu mỗi ngày!',
        aiAdvice: null,
        isAiGenerated: false,
      },
    };
  }
}
