import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { BudgetRepository } from '../../src/modules/budgets/repositories/budget.repository';
import { BudgetPeriodRepository } from '../../src/modules/budgets/repositories/budget-period.repository';
import { BudgetMapper } from '../../src/modules/budgets/mapper/budget.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let budgetRepo: jest.Mocked<BudgetRepository>;
  let periodRepo: jest.Mocked<BudgetPeriodRepository>;

  beforeEach(() => {
    budgetRepo = {
      findActiveByWalletCategory: jest.fn(),
    } as any;
    periodRepo = {
      findByDate: jest.fn(),
      findAfter: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new BudgetsService(
      {} as any,
      budgetRepo,
      periodRepo,
      {} as WalletsService,
      {} as CategoriesService,
      {} as NotificationsService,
      new BudgetMapper(),
    );
  });

  it('sends each threshold alert once and resets both after spending falls below 80%', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const period = {
      id: 'period-1',
      startDate: today,
      endDate: today,
      limitAmount: 1000,
      rolloverAmount: 0,
      spentAmount: 0,
      warningAlertSent: false,
      exceededAlertSent: false,
    };
    const budget = {
      id: 'budget-1',
      walletId: 'wallet-1',
      categoryId: 'category-1',
      category: { name: 'Ăn uống' },
      isRollover: false,
    };
    budgetRepo.findActiveByWalletCategory.mockResolvedValue([budget] as any);
    periodRepo.findByDate.mockResolvedValue(period as any);
    periodRepo.findAfter.mockResolvedValue([]);
    periodRepo.save.mockImplementation(async (value) => value);

    const impact = (amount: number) => ({
      walletId: 'wallet-1',
      categoryId: 'category-1',
      amount,
      type: TransactionType.EXPENSE,
      transactionDate: new Date(),
    });

    const warning = await service.syncTransactionChange(
      null,
      impact(800),
      {} as any,
    );
    const repeatedWarning = await service.syncTransactionChange(
      null,
      impact(10),
      {} as any,
    );
    const exceeded = await service.syncTransactionChange(
      null,
      impact(200),
      {} as any,
    );
    const belowThreshold = await service.syncTransactionChange(
      impact(300),
      null,
      {} as any,
    );
    expect(period.warningAlertSent).toBe(false);
    expect(period.exceededAlertSent).toBe(false);
    const warningAgain = await service.syncTransactionChange(
      null,
      impact(100),
      {} as any,
    );

    expect(warning.map((alert) => alert.type)).toEqual([
      NotificationType.BUDGET_WARNING,
    ]);
    expect(repeatedWarning).toHaveLength(0);
    expect(exceeded.map((alert) => alert.type)).toEqual([
      NotificationType.BUDGET_EXCEEDED,
    ]);
    expect(belowThreshold).toHaveLength(0);
    expect(warningAgain.map((alert) => alert.type)).toEqual([
      NotificationType.BUDGET_WARNING,
    ]);
  });

  it('advances active budgets to the current period in its scheduled transaction', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const period = {
      id: 'period-1',
      startDate: today,
      endDate: today,
      limitAmount: 1000,
      rolloverAmount: 0,
      spentAmount: 100,
    };
    budgetRepo.findAllActive = jest.fn().mockResolvedValue([
      {
        id: 'budget-1',
        isRollover: false,
      },
    ]) as any;
    periodRepo.findByDate.mockResolvedValue(period as any);
    periodRepo.findAfter.mockResolvedValue([]);
    const manager = {};
    (service as any).dataSource.transaction = jest.fn(
      (callback: (manager: object) => Promise<void>) => callback(manager),
    );

    await service.advancePeriods();

    expect(budgetRepo.findAllActive).toHaveBeenCalledTimes(1);
    expect((service as any).dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(periodRepo.findByDate).toHaveBeenCalledWith(
      'budget-1',
      today,
      manager,
    );
  });
});
