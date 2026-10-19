import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RecurrencePeriod } from '../../common/enums/recurrence-period.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/enums/category-type.enum';
import { CreateNotificationDto } from '../notifications/dto/request/create-notification.dto';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletsService } from '../wallets/wallets.service';
import { BudgetQueryDto } from './dto/request/budget-query.dto';
import { CreateBudgetDto } from './dto/request/create-budget.dto';
import { UpdateBudgetDto } from './dto/request/update-budget.dto';
import { BudgetStatusResponseDto } from './dto/response/budget-status-response.dto';
import { BudgetResponseDto } from './dto/response/budget-response.dto';
import { BudgetPeriod } from './entities/budget-period.entity';
import { Budget } from './entities/budget.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Optional } from '@nestjs/common';
import {
  BudgetDuplicateException,
  BudgetNotFoundException,
  InvalidBudgetDateException,
  InvalidBudgetCategoryException,
} from './exceptions/budget.exception';
import { BudgetMapper } from './mapper/budget.mapper';
import { BudgetPeriodRepository } from './repositories/budget-period.repository';
import { BudgetRepository } from './repositories/budget.repository';
import { PaginatedResponse } from '../../common/response/api-response';

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export interface BudgetAlertEvent {
  budgetId: string;
  walletId: string;
  categoryName: string;
  percentage: number;
  spentAmount?: number;
  effectiveLimit?: number;
  type: NotificationType.BUDGET_WARNING | NotificationType.BUDGET_EXCEEDED;
}

export interface TransactionBudgetImpact {
  walletId: string;
  categoryId: string;
  amount: number;
  currency?: string;
  type: TransactionType;
  transactionDate: Date;
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly budgetRepo: BudgetRepository,
    private readonly periodRepo: BudgetPeriodRepository,
    private readonly walletsService: WalletsService,
    private readonly categoriesService: CategoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly mapper: BudgetMapper,
    @Optional()
    private readonly exchangeRatesService?: ExchangeRatesService,
  ) {}

  async createBudget(userId: string, dto: CreateBudgetDto) {
    await this.walletsService.assertWalletAccess(dto.walletId, userId, 'write');
    const category =
      await this.categoriesService.validateCategoryForTransaction(
        dto.categoryId,
        TransactionType.EXPENSE,
        userId,
      );
    if (category.type !== CategoryType.EXPENSE) {
      throw new InvalidBudgetCategoryException();
    }
    this.assertDate(dto.startDate);

    if (
      await this.budgetRepo.findByWalletCategoryPeriod(
        dto.walletId,
        dto.categoryId,
        dto.period,
      )
    ) {
      throw new BudgetDuplicateException();
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const budget = await this.budgetRepo.save(
          this.budgetRepo.create({
            walletId: dto.walletId,
            categoryId: dto.categoryId,
            period: dto.period,
            limitAmount: dto.limitAmount,
            startDate: dto.startDate,
            isRollover: dto.isRollover ?? false,
            category,
          }),
          manager,
        );
        const firstPeriod = await this.createPeriod(
          budget,
          dto.startDate,
          0,
          manager,
        );
        return this.mapper.toResponse(budget, firstPeriod);
      });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new BudgetDuplicateException();
      }
      throw error;
    }
  }

  async getBudgets(userId: string, query: BudgetQueryDto) {
    let walletIds = await this.walletsService.getUserWalletIds(userId);
    if (query.walletId) {
      await this.walletsService.assertWalletAccess(
        query.walletId,
        userId,
        'read',
      );
      walletIds = [query.walletId];
    }
    const [budgets, total] = await this.budgetRepo.findPaged(query, walletIds);
    const items: BudgetResponseDto[] = [];
    for (const budget of budgets) {
      const current = await this.ensurePeriodThrough(budget, this.today());
      items.push(this.mapper.toResponse(budget, current));
    }
    return PaginatedResponse.of(items, total, query.page, query.limit);
  }

  async getBudgetById(userId: string, id: string) {
    const budget = await this.getAccessibleBudget(userId, id, 'read');
    const current = await this.ensurePeriodThrough(budget, this.today());
    const periods = await this.periodRepo.findAll(id);
    return this.mapper.toResponse(budget, current, periods);
  }

  async getBudgetStatus(
    userId: string,
    id: string,
  ): Promise<BudgetStatusResponseDto> {
    const budget = await this.getAccessibleBudget(userId, id, 'read');
    const today = this.today();
    const period =
      (await this.ensurePeriodThrough(budget, today)) ??
      (await this.periodRepo.findLatest(budget.id));
    if (!period) throw new BudgetNotFoundException(id);

    const effectiveLimit = round2(period.limitAmount + period.rolloverAmount);
    const remainingAmount = round2(effectiveLimit - period.spentAmount);
    const percentage =
      effectiveLimit > 0
        ? round2((period.spentAmount / effectiveLimit) * 100)
        : 100;
    const firstRemainingDay =
      today < period.startDate ? period.startDate : today;
    const daysRemaining = Math.max(
      0,
      Math.floor(
        (this.date(period.endDate).getTime() -
          this.date(firstRemainingDay).getTime()) /
          DAY_MS,
      ) + 1,
    );

    return {
      budgetId: budget.id,
      category: {
        id: budget.category.id,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
      },
      period: budget.period,
      startDate: period.startDate,
      endDate: period.endDate,
      daysRemaining,
      limitAmount: period.limitAmount,
      rolloverAmount: period.rolloverAmount,
      effectiveLimit,
      spentAmount: period.spentAmount,
      remainingAmount,
      percentage,
      dailyBudgetRemaining:
        daysRemaining > 0
          ? round2(Math.max(remainingAmount, 0) / daysRemaining)
          : 0,
      alertStatus:
        percentage >= 100 ? 'EXCEEDED' : percentage >= 80 ? 'WARNING' : 'SAFE',
    };
  }

  async updateBudget(userId: string, id: string, dto: UpdateBudgetDto) {
    const budget = await this.getAccessibleBudget(userId, id, 'write');
    return this.dataSource.transaction(async (manager) => {
      const current = await this.ensurePeriodThrough(
        budget,
        this.today(),
        manager,
      );
      if (dto.limitAmount !== undefined) {
        budget.limitAmount = dto.limitAmount;
        if (current) current.limitAmount = dto.limitAmount;
      }
      if (dto.isRollover !== undefined) budget.isRollover = dto.isRollover;

      if (dto.period && dto.period !== budget.period) {
        const today = this.today();
        const rollover =
          current && budget.isRollover
            ? round2(
                current.limitAmount +
                  current.rolloverAmount -
                  current.spentAmount,
              )
            : 0;
        if (current) {
          current.endDate =
            this.previousDay(today) >= current.startDate
              ? this.previousDay(today)
              : current.startDate;
          await this.periodRepo.save(current, manager);
        }
        budget.period = dto.period;
        budget.startDate = today;
        const saved = await this.budgetRepo.save(budget, manager);
        const next = await this.createPeriod(saved, today, rollover, manager);
        return this.mapper.toResponse(saved, next);
      }

      const saved = await this.budgetRepo.save(budget, manager);
      if (current) {
        await this.periodRepo.save(current, manager);
        await this.refreshFollowingRollovers(saved, current, manager);
      }
      return this.mapper.toResponse(saved, current);
    });
  }

  async deleteBudget(userId: string, id: string): Promise<void> {
    await this.getAccessibleBudget(userId, id, 'write');
    await this.budgetRepo.softDelete(id);
  }

  async resetPeriod(userId: string, id: string) {
    const budget = await this.getAccessibleBudget(userId, id, 'write');
    return this.dataSource.transaction(async (manager) => {
      const current = await this.ensurePeriodThrough(
        budget,
        this.today(),
        manager,
      );
      if (!current) throw new BudgetNotFoundException(id);
      const today = this.today();
      if (current.startDate === today) {
        return this.mapper.toResponse(budget, current);
      }
      const nextStart =
        today > current.startDate ? today : this.nextDay(current.endDate);
      current.endDate =
        this.previousDay(nextStart) >= current.startDate
          ? this.previousDay(nextStart)
          : current.startDate;
      await this.periodRepo.save(current, manager);

      const rollover = budget.isRollover
        ? round2(
            current.limitAmount + current.rolloverAmount - current.spentAmount,
          )
        : 0;
      const next = await this.createPeriod(
        budget,
        nextStart,
        rollover,
        manager,
      );
      return this.mapper.toResponse(budget, next);
    });
  }

  async advancePeriods(): Promise<void> {
    const budgets = await this.budgetRepo.findAllActive();
    const today = this.today();
    for (const budget of budgets) {
      await this.dataSource.transaction(async (manager) => {
        const current = await this.ensurePeriodThrough(budget, today, manager);
        if (current) {
          await this.refreshFollowingRollovers(budget, current, manager);
        }
      });
    }
  }

  async syncTransactionToBudget(
    walletId: string,
    categoryId: string,
    amountDelta: number,
    transactionDate: Date,
    manager: EntityManager,
  ): Promise<BudgetAlertEvent[]> {
    return this.syncTransactionChange(
      null,
      {
        walletId,
        categoryId,
        amount: amountDelta,
        type: TransactionType.EXPENSE,
        transactionDate,
      },
      manager,
    );
  }

  async syncTransactionChange(
    previous: TransactionBudgetImpact | null,
    next: TransactionBudgetImpact | null,
    manager: EntityManager,
  ): Promise<BudgetAlertEvent[]> {
    const impacts = new Map<
      string,
      { budget: Budget; period: BudgetPeriod; amountDelta: number }
    >();
    for (const [item, sign] of [
      [previous, -1],
      [next, 1],
    ] as const) {
      if (!item || item.type !== TransactionType.EXPENSE) continue;
      const budgets = await this.budgetRepo.findActiveByWalletCategory(
        item.walletId,
        item.categoryId,
        manager,
      );
      const date = item.transactionDate.toISOString().slice(0, 10);
      for (const budget of budgets) {
        let amount = item.amount;
        const targetCurrency = budget.wallet?.defaultCurrency;
        if (
          item.currency &&
          targetCurrency &&
          item.currency.trim().toUpperCase() !==
            targetCurrency.trim().toUpperCase() &&
          this.exchangeRatesService
        ) {
          const fx = await this.exchangeRatesService.convert(
            item.amount,
            item.currency,
            targetCurrency,
          );
          amount = fx.convertedAmount;
        }

        const period = await this.ensurePeriodThrough(budget, date, manager);
        if (!period) continue;
        const key = `${budget.id}:${period.id}`;
        const impact = impacts.get(key);
        if (impact) impact.amountDelta += sign * amount;
        else
          impacts.set(key, { budget, period, amountDelta: sign * amount });
      }
    }

    const alerts: BudgetAlertEvent[] = [];
    for (const { budget, period, amountDelta } of impacts.values()) {
      period.spentAmount = round2(
        Math.max(0, period.spentAmount + amountDelta),
      );
      const effectiveLimit = period.limitAmount + period.rolloverAmount;
      const percentage =
        effectiveLimit > 0
          ? (period.spentAmount / effectiveLimit) * 100
          : period.spentAmount > 0
            ? 100
            : 0;
      if (percentage < 80) {
        period.warningAlertSent = false;
        period.exceededAlertSent = false;
      } else if (this.isTodayInPeriod(period) && !period.warningAlertSent) {
        period.warningAlertSent = true;
        alerts.push({
          budgetId: budget.id,
          walletId: budget.walletId,
          categoryName: budget.category?.name ?? 'Danh mục',
          percentage: round2(percentage),
          spentAmount: period.spentAmount,
          effectiveLimit,
          type: NotificationType.BUDGET_WARNING,
        });
      }

      if (
        percentage >= 100 &&
        this.isTodayInPeriod(period) &&
        !period.exceededAlertSent
      ) {
        period.exceededAlertSent = true;
        alerts.push({
          budgetId: budget.id,
          walletId: budget.walletId,
          categoryName: budget.category?.name ?? 'Danh mục',
          percentage: round2(percentage),
          spentAmount: period.spentAmount,
          effectiveLimit,
          type: NotificationType.BUDGET_EXCEEDED,
        });
      }
      await this.periodRepo.save(period, manager);
      await this.refreshFollowingRollovers(budget, period, manager);
    }
    return alerts;
  }

  async notifyBudgetAlerts(alerts: BudgetAlertEvent[]): Promise<void> {
    for (const alert of alerts) {
      const userIds = await this.walletsService.getAcceptedMemberUserIds(
        alert.walletId,
      );
      const formattedLimit =
        alert.spentAmount !== undefined && alert.effectiveLimit !== undefined
          ? ` (${alert.spentAmount.toLocaleString()} / ${alert.effectiveLimit.toLocaleString()})`
          : '';
      const dto: Omit<CreateNotificationDto, 'userId'> = {
        type: alert.type,
        title:
          alert.type === NotificationType.BUDGET_EXCEEDED
            ? 'Đã vượt ngân sách'
            : 'Cảnh báo ngân sách',
        body: `Danh mục ${alert.categoryName} đã sử dụng ${alert.percentage}% hạn mức${formattedLimit}.`,
        relatedEntityType: 'budget',
        relatedEntityId: alert.budgetId,
      };
      await Promise.all(
        userIds.map((userId) =>
          this.notificationsService.createNotification({ ...dto, userId }),
        ),
      );
    }
  }

  private async getAccessibleBudget(
    userId: string,
    id: string,
    mode: 'read' | 'write',
  ): Promise<Budget> {
    const budget = await this.budgetRepo.findById(id);
    if (!budget) throw new BudgetNotFoundException(id);
    await this.walletsService.assertWalletAccess(budget.walletId, userId, mode);
    return budget;
  }

  private async ensurePeriodThrough(
    budget: Budget,
    targetDate: string,
    manager?: EntityManager,
  ): Promise<BudgetPeriod | null> {
    if (targetDate < budget.startDate) return null;
    const existing = await this.periodRepo.findByDate(
      budget.id,
      targetDate,
      manager,
    );
    if (existing) return existing;

    let latest = await this.periodRepo.findLatest(budget.id, manager);
    if (!latest) {
      latest = await this.createPeriod(budget, budget.startDate, 0, manager);
    }
    while (latest.endDate < targetDate) {
      const nextStart = this.nextDay(latest.endDate);
      const rollover = budget.isRollover
        ? round2(
            latest.limitAmount + latest.rolloverAmount - latest.spentAmount,
          )
        : 0;
      latest = await this.createPeriod(budget, nextStart, rollover, manager);
    }
    return this.periodRepo.findByDate(budget.id, targetDate, manager);
  }

  private async createPeriod(
    budget: Budget,
    startDate: string,
    rolloverAmount: number,
    manager?: EntityManager,
  ): Promise<BudgetPeriod> {
    return this.periodRepo.createOrGet(
      {
        budgetId: budget.id,
        startDate,
        endDate: this.periodEnd(startDate, budget.period),
        limitAmount: budget.limitAmount,
        spentAmount: 0,
        rolloverAmount,
      },
      manager,
    );
  }

  private async refreshFollowingRollovers(
    budget: Budget,
    period: BudgetPeriod,
    manager?: EntityManager,
  ): Promise<void> {
    const following = await this.periodRepo.findAfter(
      budget.id,
      period.startDate,
      manager,
    );
    let previous = period;
    for (const item of following) {
      item.rolloverAmount = budget.isRollover
        ? round2(
            previous.limitAmount +
              previous.rolloverAmount -
              previous.spentAmount,
          )
        : 0;
      await this.periodRepo.save(item, manager);
      previous = item;
    }
  }

  private periodEnd(startDate: string, period: RecurrencePeriod): string {
    const start = this.date(startDate);
    if (period === RecurrencePeriod.WEEKLY) {
      const daysUntilSunday = (7 - start.getUTCDay()) % 7;
      start.setUTCDate(start.getUTCDate() + daysUntilSunday);
    } else if (period === RecurrencePeriod.MONTHLY) {
      start.setUTCMonth(start.getUTCMonth() + 1, 0);
    } else {
      start.setUTCMonth(11, 31);
    }
    return start.toISOString().slice(0, 10);
  }

  private assertDate(value: string): void {
    const date = this.date(value);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new InvalidBudgetDateException();
    }
  }

  private isTodayInPeriod(period: BudgetPeriod): boolean {
    const today = this.today();
    return period.startDate <= today && period.endDate >= today;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private date(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private nextDay(value: string): string {
    const date = this.date(value);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  private previousDay(value: string): string {
    const date = this.date(value);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }
}
