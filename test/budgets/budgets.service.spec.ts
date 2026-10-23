import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { BudgetRepository } from '../../src/modules/budgets/repositories/budget.repository';
import { BudgetPeriodRepository } from '../../src/modules/budgets/repositories/budget-period.repository';
import { BudgetMapper } from '../../src/modules/budgets/mapper/budget.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import { CategoryType } from '../../src/modules/categories/enums/category-type.enum';
import { RecurrencePeriod } from '../../src/common/enums/recurrence-period.enum';
import {
  BudgetDuplicateException,
  BudgetNotFoundException,
  InvalidBudgetCategoryException,
  InvalidBudgetDateException,
} from '../../src/modules/budgets/exceptions/budget.exception';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let budgetRepo: jest.Mocked<BudgetRepository>;
  let periodRepo: jest.Mocked<BudgetPeriodRepository>;
  let walletsService: jest.Mocked<WalletsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let exchangeRatesService: { convert: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    budgetRepo = {
      findActiveByWalletCategory: jest.fn(),
      findByWalletCategoryPeriod: jest.fn(),
      findById: jest.fn(),
      create: jest.fn((value) => value as any),
      save: jest.fn(async (value) => value),
    } as any;
    periodRepo = {
      findByDate: jest.fn(),
      findLatest: jest.fn(),
      findAfter: jest.fn(),
      save: jest.fn(),
      createOrGet: jest.fn(),
    } as any;
    walletsService = {
      assertWalletAccess: jest.fn(),
    } as any;
    categoriesService = {
      validateCategoryForTransaction: jest.fn(),
    } as any;
    exchangeRatesService = {
      convert: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((callback) => callback({})),
    };

    const auditLogsService = {
      recordLog: jest.fn(),
    };

    service = new BudgetsService(
      dataSource as any,
      budgetRepo,
      periodRepo,
      walletsService,
      categoriesService,
      {} as NotificationsService,
      new BudgetMapper(),
      auditLogsService as any,
      exchangeRatesService as any,
    );
  });

  it('rejects budget creation when the user cannot write to the wallet', async () => {
    walletsService.assertWalletAccess.mockRejectedValue(new Error('Forbidden'));
    const dto = {
      walletId: 'wallet-1',
      categoryId: 'category-1',
      period: RecurrencePeriod.MONTHLY,
      limitAmount: 1000,
      startDate: '2026-10-01',
    };

    await expect(service.createBudget('user-1', dto as any)).rejects.toThrow(
      'Forbidden',
    );
    expect(walletsService.assertWalletAccess).toHaveBeenCalledWith(
      'wallet-1',
      'user-1',
      'write',
    );
    expect(
      categoriesService.validateCategoryForTransaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects income categories for budgets', async () => {
    categoriesService.validateCategoryForTransaction.mockResolvedValue({
      type: CategoryType.INCOME,
    } as any);
    const dto = {
      walletId: 'wallet-1',
      categoryId: 'category-1',
      period: RecurrencePeriod.MONTHLY,
      limitAmount: 1000,
      startDate: '2026-10-01',
    };

    await expect(
      service.createBudget('user-1', dto as any),
    ).rejects.toBeInstanceOf(InvalidBudgetCategoryException);
    expect(budgetRepo.findByWalletCategoryPeriod).not.toHaveBeenCalled();
  });

  it('rejects duplicate budgets for the same wallet, category, and period', async () => {
    categoriesService.validateCategoryForTransaction.mockResolvedValue({
      type: CategoryType.EXPENSE,
    } as any);
    budgetRepo.findByWalletCategoryPeriod.mockResolvedValue({
      id: 'existing',
    } as any);
    const dto = {
      walletId: 'wallet-1',
      categoryId: 'category-1',
      period: RecurrencePeriod.MONTHLY,
      limitAmount: 1000,
      startDate: '2026-10-01',
    };

    await expect(
      service.createBudget('user-1', dto as any),
    ).rejects.toBeInstanceOf(BudgetDuplicateException);
    expect(budgetRepo.findByWalletCategoryPeriod).toHaveBeenCalledWith(
      'wallet-1',
      'category-1',
      RecurrencePeriod.MONTHLY,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid start dates before writing', async () => {
    categoriesService.validateCategoryForTransaction.mockResolvedValue({
      type: CategoryType.EXPENSE,
    } as any);
    const dto = {
      walletId: 'wallet-1',
      categoryId: 'category-1',
      period: RecurrencePeriod.MONTHLY,
      limitAmount: 1000,
      startDate: '2026-02-30',
    };

    await expect(
      service.createBudget('user-1', dto as any),
    ).rejects.toBeInstanceOf(InvalidBudgetDateException);
    expect(budgetRepo.findByWalletCategoryPeriod).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([
    [true, 4200],
    [false, 0],
  ])(
    'resets the period with rollover enabled=%s and amount=%s',
    async (isRollover, expectedRollover) => {
      jest.spyOn(service as any, 'today').mockReturnValue('2026-10-19');
      const budget = {
        id: 'budget-1',
        walletId: 'wallet-1',
        categoryId: 'category-1',
        category: { name: 'Food' },
        period: RecurrencePeriod.MONTHLY,
        startDate: '2026-10-01',
        limitAmount: 5000,
        isRollover,
      };
      const current = {
        id: 'period-1',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        limitAmount: 5000,
        rolloverAmount: 200,
        spentAmount: 1000,
      };
      const next = {
        id: 'period-2',
        startDate: '2026-10-19',
        endDate: '2026-10-31',
        limitAmount: 5000,
        rolloverAmount: expectedRollover,
        spentAmount: 0,
      };
      budgetRepo.findById.mockResolvedValue(budget as any);
      periodRepo.findByDate.mockResolvedValue(current as any);
      periodRepo.createOrGet.mockResolvedValue(next as any);

      const result = await service.resetPeriod('user-1', 'budget-1');

      expect(current.endDate).toBe('2026-10-18');
      expect(periodRepo.save).toHaveBeenCalledWith(current, expect.anything());
      expect(periodRepo.createOrGet).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetId: 'budget-1',
          startDate: '2026-10-19',
          rolloverAmount: expectedRollover,
        }),
        expect.anything(),
      );
      expect(result.currentPeriod?.rolloverAmount).toBe(expectedRollover);
    },
  );

  it('does not create a duplicate period when reset is called on its start date', async () => {
    jest.spyOn(service as any, 'today').mockReturnValue('2026-10-19');
    const budget = {
      id: 'budget-1',
      walletId: 'wallet-1',
      categoryId: 'category-1',
      category: { name: 'Food' },
      period: RecurrencePeriod.MONTHLY,
      startDate: '2026-10-19',
      limitAmount: 5000,
      isRollover: true,
    };
    const current = {
      id: 'period-1',
      startDate: '2026-10-19',
      endDate: '2026-10-31',
      limitAmount: 5000,
      rolloverAmount: 100,
      spentAmount: 0,
    };
    budgetRepo.findById.mockResolvedValue(budget as any);
    periodRepo.findByDate.mockResolvedValue(current as any);

    const result = await service.resetPeriod('user-1', 'budget-1');

    expect(periodRepo.save).not.toHaveBeenCalled();
    expect(periodRepo.createOrGet).not.toHaveBeenCalled();
    expect(result.currentPeriod?.id).toBe('period-1');
  });

  it('rejects status access when the budget does not exist', async () => {
    budgetRepo.findById.mockResolvedValue(null);

    await expect(
      service.getBudgetStatus('user-1', 'missing-budget'),
    ).rejects.toBeInstanceOf(BudgetNotFoundException);
    expect(walletsService.assertWalletAccess).not.toHaveBeenCalled();
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

  it('converts amount using ExchangeRatesService when transaction currency differs from wallet defaultCurrency', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const period = {
      id: 'period-1',
      startDate: today,
      endDate: today,
      limitAmount: 10000000,
      rolloverAmount: 0,
      spentAmount: 0,
      warningAlertSent: false,
      exceededAlertSent: false,
    };
    const budget = {
      id: 'budget-1',
      walletId: 'wallet-1',
      wallet: { defaultCurrency: 'VND' },
      categoryId: 'category-1',
      category: { name: 'Food' },
      isRollover: false,
    };
    budgetRepo.findActiveByWalletCategory.mockResolvedValue([budget] as any);
    periodRepo.findByDate.mockResolvedValue(period as any);
    periodRepo.findAfter.mockResolvedValue([]);
    periodRepo.save.mockImplementation(async (value) => value);

    exchangeRatesService.convert.mockResolvedValue({
      convertedAmount: 2500000,
    });

    await service.syncTransactionChange(
      null,
      {
        walletId: 'wallet-1',
        categoryId: 'category-1',
        amount: 100,
        currency: 'USD',
        type: TransactionType.EXPENSE,
        transactionDate: new Date(),
      },
      {} as any,
    );

    expect(exchangeRatesService.convert).toHaveBeenCalledWith(100, 'USD', 'VND');
    expect(period.spentAmount).toBe(2500000);
  });

  it('swaps spending correctly when transaction category changes', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const periodFood = {
      id: 'period-food',
      startDate: today,
      endDate: today,
      limitAmount: 5000,
      rolloverAmount: 0,
      spentAmount: 2000,
      warningAlertSent: false,
      exceededAlertSent: false,
    };
    const periodShopping = {
      id: 'period-shopping',
      startDate: today,
      endDate: today,
      limitAmount: 8000,
      rolloverAmount: 0,
      spentAmount: 1000,
      warningAlertSent: false,
      exceededAlertSent: false,
    };

    const budgetFood = {
      id: 'budget-food',
      walletId: 'wallet-1',
      categoryId: 'cat-food',
      category: { name: 'Food' },
      isRollover: false,
    };
    const budgetShopping = {
      id: 'budget-shopping',
      walletId: 'wallet-1',
      categoryId: 'cat-shopping',
      category: { name: 'Shopping' },
      isRollover: false,
    };

    budgetRepo.findActiveByWalletCategory.mockImplementation(
      async (walletId: string, categoryId: string) => {
        if (categoryId === 'cat-food') return [budgetFood] as any;
        if (categoryId === 'cat-shopping') return [budgetShopping] as any;
        return [];
      },
    );

    periodRepo.findByDate.mockImplementation(
      async (budgetId: string) => {
        if (budgetId === 'budget-food') return periodFood as any;
        if (budgetId === 'budget-shopping') return periodShopping as any;
        return null;
      },
    );
    periodRepo.findAfter.mockResolvedValue([]);
    periodRepo.save.mockImplementation(async (value) => value);

    await service.syncTransactionChange(
      {
        walletId: 'wallet-1',
        categoryId: 'cat-food',
        amount: 500,
        type: TransactionType.EXPENSE,
        transactionDate: new Date(),
      },
      {
        walletId: 'wallet-1',
        categoryId: 'cat-shopping',
        amount: 500,
        type: TransactionType.EXPENSE,
        transactionDate: new Date(),
      },
      {} as any,
    );

    expect(periodFood.spentAmount).toBe(1500); // 2000 - 500
    expect(periodShopping.spentAmount).toBe(1500); // 1000 + 500
  });
});
