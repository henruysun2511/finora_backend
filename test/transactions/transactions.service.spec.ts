import { DataSource } from 'typeorm';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { TransactionRepository } from '../../src/modules/transactions/repositories/transaction.repository';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { TransactionMapper } from '../../src/modules/transactions/mapper/transaction.mapper';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import { TransactionSource } from '../../src/modules/transactions/enums/transaction-source.enum';
import { TransactionVisibility } from '../../src/common/enums/transaction-visibility.enum';
import { TransactionStatus } from '../../src/modules/transactions/enums/transaction-status.enum';
import {
  TransactionAccessDeniedException,
  TransactionNotFoundException,
} from '../../src/modules/transactions/exceptions/transaction.exception';
import {
  AccountAccessDeniedException,
  AccountArchivedException,
  AccountInsufficientBalanceException,
} from '../../src/modules/accounts/exceptions/account.exception';
import { CategoryTypeConflictException } from '../../src/modules/categories/exceptions/category.exception';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let dataSource: jest.Mocked<DataSource>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let accountsService: jest.Mocked<AccountsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let budgetsService: jest.Mocked<BudgetsService>;
  let mapper: TransactionMapper;

  const mockManager = {
    save: jest.fn(),
  } as any;

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (manager: any) => any) => cb(mockManager)),
    } as any;

    transactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findPaged: jest.fn(),
      findForDailyGrid: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    accountsService = {
      validateAccountForTransaction: jest.fn(),
      executeTransactionBalance: jest.fn(),
      adjustTransactionBalance: jest.fn(),
      revertTransactionBalance: jest.fn(),
      getUserAccessibleAccountIds: jest.fn(),
    } as any;

    categoriesService = {
      validateCategoryForTransaction: jest.fn(),
    } as any;

    budgetsService = {
      syncTransactionChange: jest.fn().mockResolvedValue([]),
      notifyBudgetAlerts: jest.fn().mockResolvedValue(undefined),
    } as any;

    mapper = new TransactionMapper();

    const auditLogsService = {
      recordLog: jest.fn(),
    } as any;

    service = new TransactionsService(
      dataSource,
      transactionRepo,
      accountsService,
      categoriesService,
      mapper,
      budgetsService,
      auditLogsService,
    );
  });

  describe('createTransaction', () => {
    const userId = 'user-1';
    const mockAccount = {
      id: 'acc-1',
      walletId: 'w-1',
      name: 'Tài khoản chính',
      currency: 'VND',
      balance: 1000000,
      isArchived: false,
    } as any;

    const mockCategory = {
      id: 'cat-1',
      name: 'Ăn uống',
      type: 'EXPENSE',
      icon: 'utensils',
      color: '#FF5722',
    } as any;

    it('Tạo giao dịch CHI TIÊU (EXPENSE) thành công và cập nhật số dư trừ', async () => {
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      categoriesService.validateCategoryForTransaction.mockResolvedValue(mockCategory);
      accountsService.executeTransactionBalance.mockResolvedValue({
        balanceBefore: 1000000,
        balanceAfter: 850000,
      });

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 150000,
        note: 'Ăn phở bò',
      };

      const savedEntity = {
        id: 'tx-1',
        accountId: 'acc-1',
        createdBy: userId,
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 150000,
        currency: 'VND',
        name: 'Ăn phở bò',
        note: 'Ăn phở bò',
        source: TransactionSource.MANUAL,
        status: TransactionStatus.CONFIRMED,
        visibility: TransactionVisibility.PRIVATE,
        amountHidden: false,
        excludeFromReport: false,
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      transactionRepo.create.mockReturnValue(savedEntity);
      transactionRepo.save.mockResolvedValue(savedEntity);

      const result = await service.createTransaction(userId, dto);

      expect(accountsService.validateAccountForTransaction).toHaveBeenCalledWith(userId, 'acc-1');
      expect(categoriesService.validateCategoryForTransaction).toHaveBeenCalledWith(
        'cat-1',
        TransactionType.EXPENSE,
        userId,
      );
      expect(accountsService.executeTransactionBalance).toHaveBeenCalledWith(
        {
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 150000,
        },
        mockManager,
      );
      expect(result.id).toBe('tx-1');
      expect(result.balanceAfter).toBe(850000);
      expect(result.amount).toBe(150000);
    });

    it('Tạo giao dịch THU NHẬP (INCOME) thành công và cập nhật số dư cộng', async () => {
      const mockIncomeCategory = {
        id: 'cat-2',
        name: 'Lương',
        type: 'INCOME',
      } as any;

      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      categoriesService.validateCategoryForTransaction.mockResolvedValue(mockIncomeCategory);
      accountsService.executeTransactionBalance.mockResolvedValue({
        balanceBefore: 1000000,
        balanceAfter: 20000000,
      });

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-2',
        type: TransactionType.INCOME,
        amount: 19000000,
        name: 'Lương tháng 10',
      };

      const savedEntity = {
        id: 'tx-2',
        accountId: 'acc-1',
        createdBy: userId,
        categoryId: 'cat-2',
        type: TransactionType.INCOME,
        amount: 19000000,
        currency: 'VND',
        name: 'Lương tháng 10',
        source: TransactionSource.MANUAL,
        status: TransactionStatus.CONFIRMED,
        visibility: TransactionVisibility.PRIVATE,
        amountHidden: false,
        excludeFromReport: false,
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      transactionRepo.create.mockReturnValue(savedEntity);
      transactionRepo.save.mockResolvedValue(savedEntity);

      const result = await service.createTransaction(userId, dto);

      expect(accountsService.executeTransactionBalance).toHaveBeenCalledWith(
        {
          accountId: 'acc-1',
          type: TransactionType.INCOME,
          amount: 19000000,
        },
        mockManager,
      );
      expect(result.balanceAfter).toBe(20000000);
      expect(result.type).toBe(TransactionType.INCOME);
    });

    it('Tạo giao dịch kèm ảnh photoUrl thành công', async () => {
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      categoriesService.validateCategoryForTransaction.mockResolvedValue(mockCategory);
      accountsService.executeTransactionBalance.mockResolvedValue({
        balanceBefore: 1000000,
        balanceAfter: 900000,
      });

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 100000,
        photoUrl: 'https://example.com/receipt.jpg',
      };

      const savedEntity = {
        id: 'tx-photo',
        accountId: 'acc-1',
        createdBy: userId,
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 100000,
        currency: 'VND',
        name: 'Ăn uống',
        photoUrl: 'https://example.com/receipt.jpg',
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      transactionRepo.create.mockReturnValue(savedEntity);
      transactionRepo.save.mockResolvedValue(savedEntity);

      const result = await service.createTransaction(userId, dto);

      expect(transactionRepo.save).toHaveBeenCalled();
      expect(result.photoUrl).toBe('https://example.com/receipt.jpg');
    });

    it('Ném lỗi khi tài khoản không thuộc quyền ghi của user (VIEWER)', async () => {
      accountsService.validateAccountForTransaction.mockRejectedValue(
        new AccountAccessDeniedException('w-1'),
      );

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 150000,
      };

      await expect(service.createTransaction(userId, dto)).rejects.toThrow(
        AccountAccessDeniedException,
      );
    });

    it('Ném lỗi khi tài khoản đã bị lưu trữ (Archived)', async () => {
      accountsService.validateAccountForTransaction.mockRejectedValue(
        new AccountArchivedException('acc-1'),
      );

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 150000,
      };

      await expect(service.createTransaction(userId, dto)).rejects.toThrow(
        AccountArchivedException,
      );
    });

    it('Ném lỗi khi danh mục không khớp loại thu chi (CategoryTypeConflict)', async () => {
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      categoriesService.validateCategoryForTransaction.mockRejectedValue(
        new CategoryTypeConflictException('Danh mục không phù hợp'),
      );

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.INCOME,
        amount: 150000,
      };

      await expect(service.createTransaction(userId, dto)).rejects.toThrow(
        CategoryTypeConflictException,
      );
    });

    it('Ném lỗi khi số dư tài khoản không đủ để chi tiêu', async () => {
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      categoriesService.validateCategoryForTransaction.mockResolvedValue(mockCategory);
      accountsService.executeTransactionBalance.mockRejectedValue(
        new AccountInsufficientBalanceException(100000, 500000),
      );

      const dto = {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 500000,
      };

      await expect(service.createTransaction(userId, dto)).rejects.toThrow(
        AccountInsufficientBalanceException,
      );
    });
  });

  describe('getTransactions', () => {
    it('Lấy danh sách phân trang giao dịch theo các tài khoản được phép', async () => {
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1', 'acc-2']);
      transactionRepo.findPaged.mockResolvedValue([
        [
          {
            id: 'tx-1',
            accountId: 'acc-1',
            createdBy: 'u-1',
            categoryId: 'cat-1',
            type: TransactionType.EXPENSE,
            amount: 50000,
            currency: 'VND',
            name: 'Cà phê',
            transactionDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ],
        1,
      ]);

      const result = await service.getTransactions('u-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.items[0].name).toBe('Cà phê');
    });
  });

  describe('getTransactionById', () => {
    it('Trả về chi tiết giao dịch khi user có quyền', async () => {
      transactionRepo.findById.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-1',
        createdBy: 'u-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 50000,
        currency: 'VND',
        name: 'Cà phê',
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);

      const result = await service.getTransactionById('u-1', 'tx-1');
      expect(result.id).toBe('tx-1');
    });

    it('Ném TransactionNotFoundException khi không tìm thấy', async () => {
      transactionRepo.findById.mockResolvedValue(null);
      await expect(service.getTransactionById('u-1', 'non-existent')).rejects.toThrow(
        TransactionNotFoundException,
      );
    });

    it('Ném TransactionAccessDeniedException khi user không có quyền truy cập tài khoản', async () => {
      transactionRepo.findById.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-secret',
      } as any);
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);

      await expect(service.getTransactionById('u-1', 'tx-1')).rejects.toThrow(
        TransactionAccessDeniedException,
      );
    });
  });

  describe('updateTransaction', () => {
    const userId = 'user-1';
    const mockAccount = {
      id: 'acc-1',
      currency: 'VND',
      balance: 1000000,
      isArchived: false,
    } as any;

    const mockCategory = {
      id: 'cat-1',
      name: 'Ăn uống',
      type: 'EXPENSE',
    } as any;

    const existingTransaction = {
      id: 'tx-1',
      accountId: 'acc-1',
      createdBy: userId,
      categoryId: 'cat-1',
      type: TransactionType.EXPENSE,
      amount: 100000,
      currency: 'VND',
      name: 'Cà phê sáng',
      note: 'Ghi chú cũ',
      source: TransactionSource.MANUAL,
      status: TransactionStatus.CONFIRMED,
      visibility: TransactionVisibility.PRIVATE,
      amountHidden: false,
      excludeFromReport: false,
      transactionDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      account: mockAccount,
      category: mockCategory,
    } as any;

    it('Cập nhật chỉ các trường metadata (không đổi tiền): Không gọi adjustTransactionBalance', async () => {
      transactionRepo.findById.mockResolvedValue({ ...existingTransaction });
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      transactionRepo.save.mockImplementation(async (entity) => entity);

      const dto = {
        name: 'Cà phê Highland',
        note: 'Ghi chú mới',
      };

      const result = await service.updateTransaction(userId, 'tx-1', dto);

      expect(accountsService.validateAccountForTransaction).toHaveBeenCalledWith(userId, 'acc-1');
      expect(accountsService.adjustTransactionBalance).not.toHaveBeenCalled();
      expect(result.name).toBe('Cà phê Highland');
      expect(result.note).toBe('Ghi chú mới');
    });

    it('Cập nhật số tiền: Gọi adjustTransactionBalance và trả về balanceAfter mới', async () => {
      transactionRepo.findById.mockResolvedValue({ ...existingTransaction });
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      accountsService.adjustTransactionBalance.mockResolvedValue({ balanceAfter: 850000 });
      transactionRepo.save.mockImplementation(async (entity) => entity);

      const dto = {
        amount: 150000,
      };

      const result = await service.updateTransaction(userId, 'tx-1', dto);

      expect(accountsService.adjustTransactionBalance).toHaveBeenCalledWith(
        {
          old: {
            accountId: 'acc-1',
            type: TransactionType.EXPENSE,
            amount: 100000,
          },
          new: {
            accountId: 'acc-1',
            type: TransactionType.EXPENSE,
            amount: 150000,
          },
        },
        mockManager,
      );
      expect(result.amount).toBe(150000);
      expect(result.balanceAfter).toBe(850000);
    });

    it('Cập nhật chuyển sang tài khoản mới và đổi danh mục', async () => {
      const mockNewAccount = {
        id: 'acc-2',
        currency: 'USD',
        balance: 500,
        isArchived: false,
      } as any;

      const mockNewCategory = {
        id: 'cat-2',
        name: 'Shopping',
        type: 'EXPENSE',
      } as any;

      transactionRepo.findById.mockResolvedValue({ ...existingTransaction });
      accountsService.validateAccountForTransaction
        .mockResolvedValueOnce(mockAccount) // tk cũ
        .mockResolvedValueOnce(mockNewAccount); // tk mới
      categoriesService.validateCategoryForTransaction.mockResolvedValue(mockNewCategory);
      accountsService.adjustTransactionBalance.mockResolvedValue({ balanceAfter: 450 });
      transactionRepo.save.mockImplementation(async (entity) => entity);

      const dto = {
        accountId: 'acc-2',
        categoryId: 'cat-2',
        amount: 50,
      };

      const result = await service.updateTransaction(userId, 'tx-1', dto);

      expect(accountsService.validateAccountForTransaction).toHaveBeenCalledWith(userId, 'acc-1');
      expect(accountsService.validateAccountForTransaction).toHaveBeenCalledWith(userId, 'acc-2');
      expect(categoriesService.validateCategoryForTransaction).toHaveBeenCalledWith(
        'cat-2',
        TransactionType.EXPENSE,
        userId,
      );
      expect(result.currency).toBe('USD');
      expect(result.balanceAfter).toBe(450);
    });

    it('Ném TransactionNotFoundException khi giao dịch cần sửa không tồn tại', async () => {
      transactionRepo.findById.mockResolvedValue(null);
      await expect(service.updateTransaction(userId, 'non-existent', {})).rejects.toThrow(
        TransactionNotFoundException,
      );
    });
  });

  describe('deleteTransaction', () => {
    const userId = 'user-1';
    const mockAccount = {
      id: 'acc-1',
      balance: 1000000,
    } as any;

    const existingTransaction = {
      id: 'tx-1',
      accountId: 'acc-1',
      type: TransactionType.EXPENSE,
      amount: 100000,
    } as any;

    it('Xóa giao dịch thành công: Hoàn tác số dư và gọi softDelete', async () => {
      transactionRepo.findById.mockResolvedValue(existingTransaction);
      accountsService.validateAccountForTransaction.mockResolvedValue(mockAccount);
      accountsService.revertTransactionBalance.mockResolvedValue({
        balanceBefore: 1000000,
        balanceAfter: 1100000,
      });
      transactionRepo.softDelete.mockResolvedValue(undefined);

      await service.deleteTransaction(userId, 'tx-1');

      expect(accountsService.validateAccountForTransaction).toHaveBeenCalledWith(userId, 'acc-1');
      expect(accountsService.revertTransactionBalance).toHaveBeenCalledWith(
        {
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 100000,
        },
        mockManager,
      );
      expect(transactionRepo.softDelete).toHaveBeenCalledWith('tx-1', mockManager);
    });

    it('Ném TransactionNotFoundException khi giao dịch cần xóa không tồn tại', async () => {
      transactionRepo.findById.mockResolvedValue(null);
      await expect(service.deleteTransaction(userId, 'non-existent')).rejects.toThrow(
        TransactionNotFoundException,
      );
    });
  });

  describe('getDailyGrid', () => {
    const userId = 'user-1';

    it('Lấy danh sách lưới giao dịch theo tháng và gom nhóm chính xác theo ngày', async () => {
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);

      const txDate1 = new Date('2026-10-18T10:30:00.000Z');
      const txDate2 = new Date('2026-10-18T15:00:00.000Z');
      const txDate3 = new Date('2026-10-15T09:00:00.000Z');

      const mockTxs = [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          createdBy: userId,
          categoryId: 'cat-1',
          type: TransactionType.EXPENSE,
          amount: 150000,
          currency: 'VND',
          name: 'Ăn trưa',
          transactionDate: txDate1,
          createdAt: txDate1,
          updatedAt: txDate1,
        } as any,
        {
          id: 'tx-2',
          accountId: 'acc-1',
          createdBy: userId,
          categoryId: 'cat-2',
          type: TransactionType.EXPENSE,
          amount: 60000,
          currency: 'VND',
          name: 'Cà phê',
          transactionDate: txDate2,
          createdAt: txDate2,
          updatedAt: txDate2,
        } as any,
        {
          id: 'tx-3',
          accountId: 'acc-1',
          createdBy: userId,
          categoryId: 'cat-3',
          type: TransactionType.INCOME,
          amount: 10000000,
          currency: 'VND',
          name: 'Lương tạm ứng',
          transactionDate: txDate3,
          createdAt: txDate3,
          updatedAt: txDate3,
        } as any,
      ];

      transactionRepo.findForDailyGrid.mockResolvedValue(mockTxs);

      const result = await service.getDailyGrid(userId, { month: 10, year: 2026 });

      expect(accountsService.getUserAccessibleAccountIds).toHaveBeenCalledWith(userId, undefined);
      expect(transactionRepo.findForDailyGrid).toHaveBeenCalled();
      expect(result.period.month).toBe(10);
      expect(result.period.year).toBe(2026);
      expect(result.summary.totalIncome).toBe(10000000);
      expect(result.summary.totalExpense).toBe(210000);
      expect(result.summary.netAmount).toBe(9790000);
      expect(result.summary.totalTransactions).toBe(3);

      expect(result.days).toHaveLength(2);

      // Ngày 2026-10-18 có 2 giao dịch chi tiêu
      const day18 = result.days.find((d) => d.date === '2026-10-18');
      expect(day18).toBeDefined();
      expect(day18?.totalExpense).toBe(210000);
      expect(day18?.totalIncome).toBe(0);
      expect(day18?.netAmount).toBe(-210000);
      expect(day18?.transactions).toHaveLength(2);

      // Ngày 2026-10-15 có 1 giao dịch thu nhập
      const day15 = result.days.find((d) => d.date === '2026-10-15');
      expect(day15).toBeDefined();
      expect(day15?.totalIncome).toBe(10000000);
      expect(day15?.totalExpense).toBe(0);
      expect(day15?.netAmount).toBe(10000000);
      expect(day15?.transactions).toHaveLength(1);
    });

    it('Lọc theo dải ngày tùy chỉnh (startDate, endDate) và lọc theo ví', async () => {
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);
      transactionRepo.findForDailyGrid.mockResolvedValue([]);

      const result = await service.getDailyGrid(userId, {
        startDate: '2026-10-01',
        endDate: '2026-10-07',
        walletId: 'w-1',
      });

      expect(accountsService.getUserAccessibleAccountIds).toHaveBeenCalledWith(userId, 'w-1');
      expect(result.days).toEqual([]);
      expect(result.summary.totalTransactions).toBe(0);
      expect(result.summary.netAmount).toBe(0);
    });

    it('Lọc giao dịch theo visibility trong getTransactions', async () => {
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);
      transactionRepo.findPaged.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        visibility: TransactionVisibility.FRIENDS,
      };

      await service.getTransactions(userId, query);

      expect(transactionRepo.findPaged).toHaveBeenCalledWith(query, ['acc-1']);
    });

    it('Lọc dạng lưới theo visibility trong getDailyGrid', async () => {
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-1']);
      transactionRepo.findForDailyGrid.mockResolvedValue([]);

      await service.getDailyGrid(userId, {
        startDate: '2026-10-01',
        endDate: '2026-10-07',
        visibility: TransactionVisibility.PRIVATE,
      });

      expect(transactionRepo.findForDailyGrid).toHaveBeenCalledWith(
        ['acc-1'],
        expect.objectContaining({
          visibility: TransactionVisibility.PRIVATE,
        }),
      );
    });
  });
});
