// test/accounts/accounts.service.spec.ts
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { AccountMapper } from '../../src/modules/accounts/mapper/account.mapper';
import { AccountType } from '../../src/modules/accounts/enums/account-type.enum';
import { BalanceDirection } from '../../src/common/enums/balance-direction.enum';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../src/common/enums/wallet-member-role.enum';
import {
  AccountAccessDeniedException,
  AccountArchivedException,
  AccountCurrencyChangeNotAllowedException,
  AccountCurrencyMismatchWalletException,
  AccountHasTransactionsException,
  AccountInsufficientBalanceException,
  AccountNameAlreadyExistsException,
  AccountNotFoundException,
  AccountWalletNotFoundException,
  IdempotencyKeyRequiredException,
} from '../../src/modules/accounts/exceptions/account.exception';

describe('AccountsService', () => {
  const USER = 'u1';
  const WALLET = { id: 'w1', ownerId: USER, defaultCurrency: 'VND' };
  const manager = {} as any;

  let service: AccountsService;
  let dataSource: any;
  let accountRepo: any;
  let adjustmentRepo: any;
  let walletsService: any;

  const makeAccount = (override: Record<string, any> = {}) => ({
    id: 'a1',
    walletId: 'w1',
    name: 'Tiền mặt',
    type: AccountType.CASH,
    currency: 'VND',
    balance: 100000,
    initialBalance: 100000,
    isArchived: false,
    archivedAt: null,
    createdBy: USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override,
  });

  beforeEach(() => {
    dataSource = { transaction: jest.fn((cb: any) => cb(manager)) };
    accountRepo = {
      create: jest.fn((d) => ({ id: 'a1', createdAt: new Date(), updatedAt: new Date(), ...d })),
      save: jest.fn((a) => Promise.resolve(a)),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByWalletAndName: jest.fn().mockResolvedValue(null),
      findPaged: jest.fn(),
      hasFinancialHistory: jest.fn().mockResolvedValue(false),
      softDelete: jest.fn(),
    };
    adjustmentRepo = {
      create: jest.fn((d) => ({ id: 'adj1', createdAt: new Date(), ...d })),
      save: jest.fn((a) => Promise.resolve(a)),
      findByKey: jest.fn().mockResolvedValue(null),
    };
    walletsService = {
      exists: jest.fn().mockResolvedValue(true),
      getMemberRole: jest.fn().mockResolvedValue(WalletMemberRole.OWNER),
      getUserWalletIds: jest.fn().mockResolvedValue(['w1']),
      getUserWallets: jest.fn().mockResolvedValue([WALLET]),
      findById: jest.fn().mockResolvedValue(WALLET),
    };
    service = new AccountsService(
      dataSource,
      accountRepo,
      adjustmentRepo,
      walletsService,
      new AccountMapper(),
    );
  });

  describe('createAccount', () => {
    const dto = {
      walletId: 'w1',
      name: 'Vietcombank',
      type: AccountType.BANK,
      currency: 'VND',
      initialBalance: 500000,
      accountNumberLast4: '6789',
    };

    it('tạo tài khoản thành công (happy path)', async () => {
      const result = await service.createAccount(USER, dto as any);
      expect(accountRepo.save).toHaveBeenCalledWith(expect.anything(), manager);
      expect(result.name).toBe('Vietcombank');
      expect(result.balance).toBe(500000);
      expect(result.createdBy).toBe(USER);
    });

    it('editor của ví được phép tạo tài khoản', async () => {
      walletsService.getMemberRole.mockResolvedValue(WalletMemberRole.EDITOR);
      const result = await service.createAccount(USER, dto as any);
      expect(result.name).toBe('Vietcombank');
    });

    it('trả bản ghi cũ khi gửi lặp cùng Idempotency-Key', async () => {
      accountRepo.findByIdempotencyKey.mockResolvedValue(makeAccount());
      await service.createAccount(USER, dto as any, 'key-1');
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('tự động kế thừa tiền tệ của ví nếu client không gửi currency', async () => {
      const { currency: _c, ...dtoWithoutCurrency } = dto;
      const result = await service.createAccount(USER, dtoWithoutCurrency as any);
      expect(result.currency).toBe('VND');
    });

    it('từ chối tạo tài khoản nếu currency khác với tiền tệ của ví', async () => {
      await expect(
        service.createAccount(USER, { ...dto, currency: 'USD' } as any),
      ).rejects.toBeInstanceOf(AccountCurrencyMismatchWalletException);
    });

    it('ném lỗi khi wallet không tồn tại', async () => {
      walletsService.findById.mockResolvedValue(null);
      await expect(service.createAccount(USER, dto as any)).rejects.toBeInstanceOf(
        AccountWalletNotFoundException,
      );
    });

    it('từ chối khi không phải thành viên của wallet', async () => {
      walletsService.getMemberRole.mockResolvedValue(null);
      await expect(service.createAccount(USER, dto as any)).rejects.toBeInstanceOf(
        AccountAccessDeniedException,
      );
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('từ chối khi chỉ là viewer', async () => {
      walletsService.getMemberRole.mockResolvedValue(WalletMemberRole.VIEWER);
      await expect(service.createAccount(USER, dto as any)).rejects.toBeInstanceOf(
        AccountAccessDeniedException,
      );
    });

    it('ném lỗi khi trùng tên trong cùng ví', async () => {
      accountRepo.findByWalletAndName.mockResolvedValue(makeAccount());
      await expect(service.createAccount(USER, dto as any)).rejects.toBeInstanceOf(
        AccountNameAlreadyExistsException,
      );
    });
  });

  describe('listAccounts', () => {
    it('trả danh sách và thông tin phân trang', async () => {
      accountRepo.findPaged.mockResolvedValue([[makeAccount()], 1]);
      const res = await service.listAccounts(USER, { page: 1, limit: 10, isArchived: false } as any);
      expect(res.items).toHaveLength(1);
      expect(res.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('từ chối khi lọc theo wallet ngoài phạm vi quyền', async () => {
      await expect(
        service.listAccounts(USER, { page: 1, limit: 10, isArchived: false, walletId: 'w-x' } as any),
      ).rejects.toBeInstanceOf(AccountAccessDeniedException);
    });
  });

  describe('getAccount / getBalance', () => {
    it('ném lỗi khi tài khoản không tồn tại', async () => {
      accountRepo.findById.mockResolvedValue(null);
      await expect(service.getAccount(USER, 'a1')).rejects.toBeInstanceOf(AccountNotFoundException);
    });

    it('viewer vẫn xem được chi tiết', async () => {
      accountRepo.findById.mockResolvedValue(makeAccount());
      walletsService.getMemberRole.mockResolvedValue(WalletMemberRole.VIEWER);
      const res = await service.getAccount(USER, 'a1');
      expect(res.id).toBe('a1');
    });

    it('số dư bằng 0 vẫn trả về 0', async () => {
      accountRepo.findById.mockResolvedValue(makeAccount({ balance: 0 }));
      const res = await service.getBalance(USER, 'a1');
      expect(res.balance).toBe(0);
      expect(res.currency).toBe('VND');
    });
  });

  describe('updateAccount', () => {
    it('cập nhật tên thành công', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      const res = await service.updateAccount(USER, 'a1', { name: 'Ví mới' } as any);
      expect(res.name).toBe('Ví mới');
    });

    it('từ chối cập nhật tài khoản đã lưu trữ', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ isArchived: true }));
      await expect(service.updateAccount(USER, 'a1', { name: 'X' } as any)).rejects.toBeInstanceOf(
        AccountArchivedException,
      );
    });

    it('từ chối đổi tiền tệ khác với tiền tệ của ví', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ balance: 0 }));
      await expect(
        service.updateAccount(USER, 'a1', { currency: 'USD' } as any),
      ).rejects.toBeInstanceOf(AccountCurrencyMismatchWalletException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('từ chối đổi tiền tệ khi còn số dư dù tiền tệ trùng với ví', async () => {
      walletsService.findById.mockResolvedValue({ ...WALLET, defaultCurrency: 'USD' });
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ currency: 'VND', balance: 5000 }));
      await expect(
        service.updateAccount(USER, 'a1', { currency: 'USD' } as any),
      ).rejects.toBeInstanceOf(AccountCurrencyChangeNotAllowedException);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('ném lỗi khi tài khoản không tồn tại', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(null);
      await expect(service.updateAccount(USER, 'a1', {} as any)).rejects.toBeInstanceOf(
        AccountNotFoundException,
      );
    });
  });

  describe('deleteAccount', () => {
    it('xóa thành công khi chưa có giao dịch', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      await service.deleteAccount(USER, 'a1');
      expect(accountRepo.softDelete).toHaveBeenCalledWith('a1', manager);
    });

    it('chặn xóa khi đã có giao dịch', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      accountRepo.hasFinancialHistory.mockResolvedValue(true);
      await expect(service.deleteAccount(USER, 'a1')).rejects.toBeInstanceOf(
        AccountHasTransactionsException,
      );
      expect(accountRepo.softDelete).not.toHaveBeenCalled();
    });

    it('ném lỗi khi tài khoản không tồn tại', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(null);
      await expect(service.deleteAccount(USER, 'a1')).rejects.toBeInstanceOf(
        AccountNotFoundException,
      );
    });
  });

  describe('archive / unarchive', () => {
    it('lưu trữ tài khoản đang hoạt động', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      const res = await service.archiveAccount(USER, 'a1');
      expect(res.isArchived).toBe(true);
      expect(res.archivedAt).toBeInstanceOf(Date);
    });

    it('lưu trữ lặp lại không ghi thêm (idempotent)', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ isArchived: true }));
      await service.archiveAccount(USER, 'a1');
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('bỏ lưu trữ thành công', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ isArchived: true }));
      const res = await service.unarchiveAccount(USER, 'a1');
      expect(res.isArchived).toBe(false);
      expect(res.archivedAt).toBeNull();
    });
  });

  describe('adjustBalance', () => {
    const inc = { direction: BalanceDirection.INCREASE, amount: 50000, reason: 'Đối chiếu' };

    it('điều chỉnh tăng: lưu số dư và lịch sử cùng transaction', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      const res = await service.adjustBalance(USER, 'a1', inc, 'key-1');
      expect(res.balanceBefore).toBe(100000);
      expect(res.balanceAfter).toBe(150000);
      expect(accountRepo.save).toHaveBeenCalledWith(expect.anything(), manager);
      expect(adjustmentRepo.save).toHaveBeenCalledWith(expect.anything(), manager);
    });

    it('điều chỉnh giảm hợp lệ', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      const res = await service.adjustBalance(
        USER,
        'a1',
        { ...inc, direction: BalanceDirection.DECREASE, amount: 30000 },
        'key-2',
      );
      expect(res.balanceAfter).toBe(70000);
    });

    it('từ chối điều chỉnh giảm vượt số dư', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount());
      await expect(
        service.adjustBalance(
          USER,
          'a1',
          { ...inc, direction: BalanceDirection.DECREASE, amount: 999999 },
          'key-3',
        ),
      ).rejects.toBeInstanceOf(AccountInsufficientBalanceException);
      expect(adjustmentRepo.save).not.toHaveBeenCalled();
    });

    it('gửi lặp cùng Idempotency-Key: không ghi lần 2', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ balance: 150000 }));
      adjustmentRepo.findByKey.mockResolvedValue({
        id: 'adj1',
        accountId: 'a1',
        userId: USER,
        direction: BalanceDirection.INCREASE,
        amount: 50000,
        balanceBefore: 100000,
        balanceAfter: 150000,
        reason: 'Đối chiếu',
        createdAt: new Date(),
      });
      const res = await service.adjustBalance(USER, 'a1', inc, 'key-1');
      expect(res.id).toBe('adj1');
      expect(accountRepo.save).not.toHaveBeenCalled();
      expect(adjustmentRepo.save).not.toHaveBeenCalled();
    });

    it('từ chối khi tài khoản đã lưu trữ', async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(makeAccount({ isArchived: true }));
      await expect(service.adjustBalance(USER, 'a1', inc, 'key-4')).rejects.toBeInstanceOf(
        AccountArchivedException,
      );
    });

    it('từ chối khi thiếu Idempotency-Key', async () => {
      await expect(service.adjustBalance(USER, 'a1', inc, undefined)).rejects.toBeInstanceOf(
        IdempotencyKeyRequiredException,
      );
    });
  });
});