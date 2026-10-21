// test/transfers/transfers.service.spec.ts
import { TransfersService } from '../../src/modules/transfers/transfers.service';
import { TransferMapper } from '../../src/modules/transfers/mapper/transfer.mapper';
import {
  TransferAccessDeniedException,
  TransferNotFoundException,
} from '../../src/modules/transfers/exceptions/transfer.exception';

describe('TransfersService', () => {
  const USER = 'u-123';
  const manager = {} as any;

  let service: TransfersService;
  let dataSource: any;
  let transferRepo: any;
  let accountsService: any;
  let exchangeRatesService: any;
  let settingsService: any;

  const fromAccVND = {
    id: 'acc-vnd-1',
    walletId: 'w-1',
    name: 'Vietcombank VND',
    currency: 'VND',
    balance: 5_000_000,
    isArchived: false,
  };

  const toAccVND = {
    id: 'acc-vnd-2',
    walletId: 'w-1',
    name: 'Tiền mặt VND',
    currency: 'VND',
    balance: 500_000,
    isArchived: false,
  };

  const toAccUSD = {
    id: 'acc-usd-1',
    walletId: 'w-2',
    name: 'Ví USD',
    currency: 'USD',
    balance: 100,
    isArchived: false,
  };

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn((cb: any) => cb(manager)),
    };

    transferRepo = {
      create: jest.fn((d) => ({
        id: 'tf-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d,
      })),
      save: jest.fn((t) => Promise.resolve(t)),
      findById: jest.fn(),
      findPaged: jest.fn(),
    };

    accountsService = {
      validateTransferAccounts: jest.fn(),
      executeTransferBalances: jest.fn().mockResolvedValue({
        fromBalanceAfter: 4_000_000,
        toBalanceAfter: 1_500_000,
      }),
      getUserAccessibleAccountIds: jest.fn().mockResolvedValue(['acc-vnd-1', 'acc-vnd-2', 'acc-usd-1']),
    };

    exchangeRatesService = {
      convert: jest.fn(),
      getExchangeRate: jest.fn(),
    };

    settingsService = {
      verifyActionPin: jest.fn().mockResolvedValue(undefined),
    };

    service = new TransfersService(
      dataSource,
      transferRepo,
      accountsService,
      exchangeRatesService,
      settingsService,
      new TransferMapper(),
    );
  });

  describe('createTransfer', () => {
    it('chuyển tiền cùng loại tiền tệ thành công (VND -> VND), tỷ giá 1:1 không cần gọi FX', async () => {
      accountsService.validateTransferAccounts.mockResolvedValue({
        fromAccount: fromAccVND,
        toAccount: toAccVND,
      });

      const dto = {
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-vnd-2',
        amount: 1_000_000,
        note: 'Chuyển tiền ăn uống',
      };

      const result = await service.createTransfer(USER, dto);

      expect(accountsService.validateTransferAccounts).toHaveBeenCalledWith(
        USER,
        'acc-vnd-1',
        'acc-vnd-2',
      );
      expect(exchangeRatesService.convert).not.toHaveBeenCalled();
      expect(accountsService.executeTransferBalances).toHaveBeenCalledWith(
        {
          fromAccountId: 'acc-vnd-1',
          toAccountId: 'acc-vnd-2',
          fromAmount: 1_000_000,
          toAmount: 1_000_000,
          fee: 0,
          feeAccountId: undefined,
        },
        manager,
      );
      expect(result.fromAmount).toBe(1_000_000);
      expect(result.toAmount).toBe(1_000_000);
      expect(result.exchangeRate).toBe(1);
      expect(result.fromCurrency).toBe('VND');
      expect(result.toCurrency).toBe('VND');
    });

    it('chuyển tiền khác loại tiền tệ (VND -> USD), tự động gọi API tỷ giá và quy đổi chính xác', async () => {
      accountsService.validateTransferAccounts.mockResolvedValue({
        fromAccount: fromAccVND,
        toAccount: toAccUSD,
      });

      exchangeRatesService.convert.mockResolvedValue({
        from: 'VND',
        to: 'USD',
        amount: 2_545_000,
        rate: 0.00003929,
        inverseRate: 25450,
        convertedAmount: 100,
        updatedAt: new Date(),
        source: 'live',
        isEstimated: false,
      });

      const dto = {
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-usd-1',
        amount: 2_545_000,
        note: 'Đổi tiền sang USD',
      };

      const result = await service.createTransfer(USER, dto);

      expect(exchangeRatesService.convert).toHaveBeenCalledWith(2_545_000, 'VND', 'USD');
      expect(accountsService.executeTransferBalances).toHaveBeenCalledWith(
        {
          fromAccountId: 'acc-vnd-1',
          toAccountId: 'acc-usd-1',
          fromAmount: 2_545_000,
          toAmount: 100,
          fee: 0,
          feeAccountId: undefined,
        },
        manager,
      );
      expect(result.fromAmount).toBe(2_545_000);
      expect(result.toAmount).toBe(100);
      expect(result.exchangeRate).toBe(0.00003929);
      expect(result.fromCurrency).toBe('VND');
      expect(result.toCurrency).toBe('USD');
    });

    it('hỗ trợ chuyển tiền có kèm phí giao dịch (fee)', async () => {
      accountsService.validateTransferAccounts.mockResolvedValue({
        fromAccount: fromAccVND,
        toAccount: toAccVND,
      });

      const dto = {
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-vnd-2',
        amount: 1_000_000,
        fee: 5500,
      };

      const result = await service.createTransfer(USER, dto);

      expect(accountsService.executeTransferBalances).toHaveBeenCalledWith(
        expect.objectContaining({
          fromAmount: 1_000_000,
          fee: 5500,
        }),
        manager,
      );
      expect(result.fee).toBe(5500);
    });
  });

  describe('convertPreview', () => {
    it('preview quy đổi khác loại tiền tệ trả về tỷ giá và số tiền nhận', async () => {
      accountsService.validateTransferAccounts.mockResolvedValue({
        fromAccount: fromAccVND,
        toAccount: toAccUSD,
      });

      exchangeRatesService.convert.mockResolvedValue({
        from: 'VND',
        to: 'USD',
        amount: 1_000_000,
        rate: 0.00003929,
        inverseRate: 25450,
        convertedAmount: 39.29,
        updatedAt: new Date(),
        source: 'live',
        isEstimated: false,
      });

      const result = await service.convertPreview(USER, {
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-usd-1',
        amount: 1_000_000,
      });

      expect(result.fromAmount).toBe(1_000_000);
      expect(result.toAmount).toBe(39.29);
      expect(result.exchangeRate).toBe(0.00003929);
      expect(result.rateSource).toBe('live');
    });

    it('preview cùng loại tiền tệ trả về tỷ giá 1:1 ngay lập tức', async () => {
      accountsService.validateTransferAccounts.mockResolvedValue({
        fromAccount: fromAccVND,
        toAccount: toAccVND,
      });

      const result = await service.convertPreview(USER, {
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-vnd-2',
        amount: 500_000,
      });

      expect(exchangeRatesService.convert).not.toHaveBeenCalled();
      expect(result.toAmount).toBe(500_000);
      expect(result.exchangeRate).toBe(1);
    });
  });

  describe('getTransfers', () => {
    it('trả về danh sách phân trang các giao dịch chuyển tiền', async () => {
      transferRepo.findPaged.mockResolvedValue([
        [
          {
            id: 'tf-1',
            fromAccountId: 'acc-vnd-1',
            toAccountId: 'acc-vnd-2',
            fromAmount: 100000,
            fromCurrency: 'VND',
            toAmount: 100000,
            toCurrency: 'VND',
            exchangeRate: 1,
            fee: 0,
            transferDate: new Date(),
            createdAt: new Date(),
          },
        ],
        1,
      ]);

      const res = await service.getTransfers(USER, { page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
    });
  });

  describe('getTransferById', () => {
    it('ném lỗi TransferNotFoundException khi giao dịch không tồn tại', async () => {
      transferRepo.findById.mockResolvedValue(null);
      await expect(service.getTransferById(USER, 'tf-none')).rejects.toBeInstanceOf(
        TransferNotFoundException,
      );
    });

    it('từ chối truy cập nếu user không có quyền vào cả 2 tài khoản', async () => {
      transferRepo.findById.mockResolvedValue({
        id: 'tf-1',
        fromAccountId: 'acc-stranger-1',
        toAccountId: 'acc-stranger-2',
      });
      accountsService.getUserAccessibleAccountIds.mockResolvedValue(['acc-my-1']);

      await expect(service.getTransferById(USER, 'tf-1')).rejects.toBeInstanceOf(
        TransferAccessDeniedException,
      );
    });

    it('cho phép xem chi tiết nếu user có quyền truy cập', async () => {
      transferRepo.findById.mockResolvedValue({
        id: 'tf-1',
        fromAccountId: 'acc-vnd-1',
        toAccountId: 'acc-vnd-2',
        fromAmount: 50000,
        fromCurrency: 'VND',
        toAmount: 50000,
        toCurrency: 'VND',
        exchangeRate: 1,
        fee: 0,
        transferDate: new Date(),
        createdAt: new Date(),
      });

      const res = await service.getTransferById(USER, 'tf-1');
      expect(res.id).toBe('tf-1');
      expect(res.fromAmount).toBe(50000);
    });
  });
});
