import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTransactionsController } from '../../src/modules/recurring-transactions/recurring-transactions.controller';
import { RecurringTransactionsService } from '../../src/modules/recurring-transactions/recurring-transactions.service';
import { CreateRecurringTransactionDto } from '../../src/modules/recurring-transactions/dto/request/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from '../../src/modules/recurring-transactions/dto/request/update-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from '../../src/modules/recurring-transactions/dto/request/recurring-transaction-query.dto';

describe('RecurringTransactionsController', () => {
  let controller: RecurringTransactionsController;
  let service: RecurringTransactionsService;

  const mockRecurringService = {
    listRules: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    createRule: jest
      .fn()
      .mockImplementation((userId, dto) =>
        Promise.resolve({ id: 'rule-1', ...dto }),
      ),
    executeNow: jest.fn().mockResolvedValue({ id: 'tx-1', amount: 100 }),
    getRuleDetail: jest.fn().mockResolvedValue({ id: 'rule-1', history: [] }),
    updateRule: jest
      .fn()
      .mockImplementation((userId, id, dto) => Promise.resolve({ id, ...dto })),
    togglePause: jest.fn().mockResolvedValue({ isPaused: true }),
    deleteRule: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringTransactionsController],
      providers: [
        {
          provide: RecurringTransactionsService,
          useValue: mockRecurringService,
        },
      ],
    }).compile();

    controller = module.get<RecurringTransactionsController>(
      RecurringTransactionsController,
    );
    service = module.get<RecurringTransactionsService>(
      RecurringTransactionsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRules', () => {
    it('should call recurringService.listRules with userId and query', async () => {
      const userId = 'user-1';
      const query: RecurringTransactionQueryDto = { page: 1, limit: 10 };

      const result = await controller.listRules(userId, query);

      expect(service.listRules).toHaveBeenCalledWith(userId, query);
      expect(result).toBeDefined();
    });
  });

  describe('createRule', () => {
    it('should call recurringService.createRule and return created response', async () => {
      const userId = 'user-1';
      const dto: CreateRecurringTransactionDto = {
        walletId: 'wallet-1',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        name: 'Netflix',
        amount: 260000,
        type: 'EXPENSE' as any,
        frequency: 'MONTHLY' as any,
        startDate: '2026-11-01',
      };

      const response = await controller.createRule(userId, dto);

      expect(service.createRule).toHaveBeenCalledWith(userId, dto);
      expect(response.data).toMatchObject({ name: 'Netflix' });
    });
  });

  describe('executeNow', () => {
    it('should execute rule immediately and return transaction response', async () => {
      const userId = 'user-1';
      const ruleId = 'rule-1';

      const response = await controller.executeNow(userId, ruleId);

      expect(service.executeNow).toHaveBeenCalledWith(userId, ruleId);
      expect(response.data).toHaveProperty('id', 'tx-1');
    });
  });

  describe('deleteRule', () => {
    it('should call deleteRule service method', async () => {
      const userId = 'user-1';
      const ruleId = 'rule-1';

      const response = await controller.deleteRule(userId, ruleId);

      expect(service.deleteRule).toHaveBeenCalledWith(userId, ruleId);
      expect(response.success).toBe(true);
    });
  });
});
