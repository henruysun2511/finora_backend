// test/transfers/transfers.controller.spec.ts
import { TransfersController } from '../../src/modules/transfers/transfers.controller';
import { TransfersService } from '../../src/modules/transfers/transfers.service';
import { PaginatedResponse } from '../../src/common/response/api-response';

describe('TransfersController', () => {
  let controller: TransfersController;
  let service: jest.Mocked<TransfersService>;
  const USER = 'u-123';

  beforeEach(() => {
    service = {
      createTransfer: jest.fn(),
      convertPreview: jest.fn(),
      getTransfers: jest.fn(),
      getTransferById: jest.fn(),
    } as any;
    controller = new TransfersController(service);
  });

  it('transferMoney gọi service và trả về 201 Created', async () => {
    const dto = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 100000,
    };
    service.createTransfer.mockResolvedValue({
      id: 'tf-1',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      fromAmount: 100000,
      fromCurrency: 'VND',
      toAmount: 100000,
      toCurrency: 'VND',
      exchangeRate: 1,
      fee: 0,
      transferDate: new Date(),
      createdAt: new Date(),
    });

    const res = await controller.transferMoney(USER, dto);
    expect(service.createTransfer).toHaveBeenCalledWith(USER, dto);
    expect(res.data.id).toBe('tf-1');
  });

  it('convertCurrency gọi preview', async () => {
    const dto = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 100000,
    };
    service.convertPreview.mockResolvedValue({
      fromAccountId: 'acc-1',
      fromAccountName: 'A1',
      fromCurrency: 'VND',
      fromAmount: 100000,
      toAccountId: 'acc-2',
      toAccountName: 'A2',
      toCurrency: 'USD',
      toAmount: 3.93,
      exchangeRate: 0.00003929,
      inverseRate: 25450,
      isEstimated: false,
      rateSource: 'live',
    });

    const res = await controller.convertCurrency(USER, dto);
    expect(service.convertPreview).toHaveBeenCalledWith(USER, dto);
    expect(res.data.toAmount).toBe(3.93);
  });

  it('getTransferList trả về danh sách phân trang', async () => {
    service.getTransfers.mockResolvedValue(PaginatedResponse.of([], 0, 1, 10));
    const res = await controller.getTransferList(USER, { page: 1, limit: 10 });
    expect(service.getTransfers).toHaveBeenCalledWith(USER, { page: 1, limit: 10 });
    expect(res.items).toEqual([]);
  });

  it('getTransferDetail trả về chi tiết giao dịch', async () => {
    service.getTransferById.mockResolvedValue({
      id: 'tf-1',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      fromAmount: 100000,
      fromCurrency: 'VND',
      toAmount: 100000,
      toCurrency: 'VND',
      exchangeRate: 1,
      fee: 0,
      transferDate: new Date(),
      createdAt: new Date(),
    });

    const res = await controller.getTransferDetail(USER, '00000000-0000-0000-0000-000000000001');
    expect(service.getTransferById).toHaveBeenCalledWith(USER, '00000000-0000-0000-0000-000000000001');
    expect(res.data.id).toBe('tf-1');
  });
});
