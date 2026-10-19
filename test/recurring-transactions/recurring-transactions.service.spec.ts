import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTransactionsService } from '../../src/modules/recurring-transactions/recurring-transactions.service';
import { RecurringTransactionRepository } from '../../src/modules/recurring-transactions/repositories/recurring-transaction.repository';
import { RecurringTransactionMapper } from '../../src/modules/recurring-transactions/mapper/recurring-transaction.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { DataSource } from 'typeorm';

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;

  // Khai báo các biến mock ở scope này để các test case bên trong có thể dùng được
  let mockDataSource: any;
  let mockRepo: any;
  let mockMapper: any;
  let mockWalletsService: any;
  let mockTransactionsService: any;
  let mockNotificationsService: any;

  beforeEach(async () => {
    mockDataSource = {
      transaction: jest.fn((cb) => cb({} as any)),
    };

    mockRepo = {
      findPaged: jest.fn(),
      findById: jest.fn(),
      saveRule: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
    };

    mockMapper = {
      toResponse: jest.fn(),
      toDetailResponse: jest.fn(),
      toEntity: jest.fn(),
    };

    mockWalletsService = {
      getUserWalletIds: jest.fn().mockResolvedValue(['wallet-1']),
    };

    mockTransactionsService = {
      createTransaction: jest.fn(),
      findByRecurringId: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: RecurringTransactionRepository, useValue: mockRepo },
        { provide: RecurringTransactionMapper, useValue: mockMapper },
        { provide: WalletsService, useValue: mockWalletsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<RecurringTransactionsService>(RecurringTransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    it('Happy path: nên tạo quy tắc định kỳ thành công khi dữ liệu hợp lệ', async () => {
      const dto = {
        walletId: 'wallet-1',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        name: 'Netflix',
        amount: 260000,
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        startDate: '2026-11-01',
      };
      
      mockRepo.create.mockReturnValue(dto);
      mockRepo.saveRule.mockResolvedValue({ id: 'rule-1', ...dto });
      mockMapper.toResponse.mockReturnValue({ id: 'rule-1', ...dto });

      const result = await service.createRule('user-1', dto as any);
      expect(result).toBeDefined();
      expect(mockRepo.saveRule).toHaveBeenCalled();
    });

    it('Edge case / Exception: nên ném ngoại lệ khi ngày kết thúc nhỏ hơn ngày bắt đầu', async () => {
      const dto = {
        walletId: 'wallet-1',
        startDate: '2026-11-10',
        endDate: '2026-11-01', // Nhỏ hơn startDate
      };

      await expect(service.createRule('user-1', dto as any)).rejects.toThrow();
    });
  });

  describe('executeNow', () => {
    it('Edge case / Exception: nên ném RecurringTransactionNotFoundException khi không tìm thấy quy tắc', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.executeNow('user-1', 'invalid-id')).rejects.toThrow();
    });
  });
});