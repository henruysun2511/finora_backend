import { TransactionsController } from '../../src/modules/transactions/transactions.controller';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import { PaginatedResponse } from '../../src/common/response/api-response';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<TransactionsService>;
  const USER_ID = 'u-123';

  beforeEach(() => {
    service = {
      createTransaction: jest.fn(),
      getTransactions: jest.fn(),
      getTransactionById: jest.fn(),
    } as any;

    controller = new TransactionsController(service);
  });

  it('createTransaction gọi service và trả về 201 Created', async () => {
    const dto = {
      accountId: 'acc-1',
      categoryId: 'cat-1',
      type: TransactionType.EXPENSE,
      amount: 50000,
      note: 'Trà đá vỉa hè',
    };

    const mockResponse = {
      id: 'tx-1',
      accountId: 'acc-1',
      createdBy: USER_ID,
      categoryId: 'cat-1',
      type: TransactionType.EXPENSE,
      amount: 50000,
      currency: 'VND',
      name: 'Trà đá vỉa hè',
      balanceAfter: 950000,
      transactionDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    service.createTransaction.mockResolvedValue(mockResponse);

    const res = await controller.createTransaction(USER_ID, dto);

    expect(service.createTransaction).toHaveBeenCalledWith(USER_ID, dto);
    expect(res.statusCode).toBe(201);
    expect(res.data?.id).toBe('tx-1');
    expect(res.data?.balanceAfter).toBe(950000);
  });

  it('getTransactions gọi service và trả về danh sách phân trang', async () => {
    const query = { page: 1, limit: 10 };
    const mockList = PaginatedResponse.of(
      [
        {
          id: 'tx-1',
          name: 'Ăn trưa',
        } as any,
      ],
      1,
      1,
      10,
    );

    service.getTransactions.mockResolvedValue(mockList);

    const res = await controller.getTransactions(USER_ID, query);

    expect(service.getTransactions).toHaveBeenCalledWith(USER_ID, query);
    expect(res.items).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('getTransactionById gọi service và trả về chi tiết giao dịch', async () => {
    const mockResponse = {
      id: 'tx-1',
      name: 'Ăn trưa',
    } as any;

    service.getTransactionById.mockResolvedValue(mockResponse);

    const res = await controller.getTransactionById(USER_ID, 'tx-1');

    expect(service.getTransactionById).toHaveBeenCalledWith(USER_ID, 'tx-1');
    expect(res.statusCode).toBe(200);
    expect(res.data?.id).toBe('tx-1');
  });

  it('updateTransaction gọi service và trả về 200 OK kèm dữ liệu đã sửa', async () => {
    service.updateTransaction = jest.fn();
    const dto = {
      amount: 60000,
      note: 'Trà đá + hướng dương',
    };

    const mockResponse = {
      id: 'tx-1',
      name: 'Trà đá vỉa hè',
      amount: 60000,
      note: 'Trà đá + hướng dương',
      balanceAfter: 940000,
    } as any;

    (service.updateTransaction as jest.Mock).mockResolvedValue(mockResponse);

    const res = await controller.updateTransaction(USER_ID, 'tx-1', dto);

    expect(service.updateTransaction).toHaveBeenCalledWith(USER_ID, 'tx-1', dto);
    expect(res.statusCode).toBe(200);
    expect(res.data?.amount).toBe(60000);
    expect(res.data?.balanceAfter).toBe(940000);
  });

  it('deleteTransaction gọi service và trả về 200 OK', async () => {
    service.deleteTransaction = jest.fn();
    (service.deleteTransaction as jest.Mock).mockResolvedValue(undefined);

    const res = await controller.deleteTransaction(USER_ID, 'tx-1');

    expect(service.deleteTransaction).toHaveBeenCalledWith(USER_ID, 'tx-1');
    expect(res.statusCode).toBe(200);
    expect(res.message).toBe('Xóa giao dịch thành công');
  });

  it('getDailyGrid gọi service và trả về danh sách lưới theo ngày', async () => {
    service.getDailyGrid = jest.fn();
    const query = { month: 10, year: 2026 };
    const mockGrid = {
      period: { month: 10, year: 2026, startDate: '2026-10-01', endDate: '2026-10-31' },
      summary: { totalIncome: 1000, totalExpense: 500, netAmount: 500, totalTransactions: 2 },
      days: [],
    } as any;

    (service.getDailyGrid as jest.Mock).mockResolvedValue(mockGrid);

    const res = await controller.getDailyGrid(USER_ID, query);

    expect(service.getDailyGrid).toHaveBeenCalledWith(USER_ID, query);
    expect(res.statusCode).toBe(200);
    expect(res.data?.summary.totalIncome).toBe(1000);
    expect(res.data?.summary.netAmount).toBe(500);
  });
});
