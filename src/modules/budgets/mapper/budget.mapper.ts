import { Injectable } from '@nestjs/common';
import { Budget } from '../entities/budget.entity';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { BudgetPeriodResponseDto } from '../dto/response/budget-period-response.dto';
import { BudgetResponseDto } from '../dto/response/budget-response.dto';

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class BudgetMapper {
  toPeriodResponse(period: BudgetPeriod): BudgetPeriodResponseDto {
    const effectiveLimit = round2(period.limitAmount + period.rolloverAmount);
    return {
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      limitAmount: period.limitAmount,
      spentAmount: period.spentAmount,
      rolloverAmount: period.rolloverAmount,
      effectiveLimit,
      remainingAmount: round2(effectiveLimit - period.spentAmount),
      percentage:
        effectiveLimit > 0
          ? round2((period.spentAmount / effectiveLimit) * 100)
          : 100,
    };
  }

  toResponse(
    budget: Budget,
    currentPeriod: BudgetPeriod | null,
    periods?: BudgetPeriod[],
  ): BudgetResponseDto {
    return {
      id: budget.id,
      walletId: budget.walletId,
      categoryId: budget.categoryId,
      category: {
        id: budget.category.id,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
      },
      period: budget.period,
      limitAmount: budget.limitAmount,
      startDate: budget.startDate,
      isRollover: budget.isRollover,
      currentPeriod: currentPeriod
        ? this.toPeriodResponse(currentPeriod)
        : null,
      ...(periods
        ? { periods: periods.map((period) => this.toPeriodResponse(period)) }
        : {}),
    };
  }
}
