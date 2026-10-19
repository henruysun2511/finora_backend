import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoansService } from '../../src/modules/loans/loans.service';
import { LoanRepository } from '../../src/modules/loans/repositories/loan.repository';
import { LoanPaymentRepository } from '../../src/modules/loans/repositories/loan-payment.repository';
import { LoanMapper } from '../../src/modules/loans/mapper/loan.mapper';

import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { UsersService } from '../../src/modules/users/users.service';

import { LoanType } from '../../src/modules/loans/enums/loan-type.enum';
import { LoanStatus } from '../../src/modules/loans/enums/loan-status.enum';
import {
  CannotDeleteLoanWithPaymentsException,
  CannotEditSettledLoanException,
  CounterpartyNotAppUserException,
  InvalidDueDateException,
  LoanAlreadySettledException,
  LoanNotFoundException,
  NotCounterpartyUserException,
  PaymentAmountExceedsRemainingException,
  ReminderRateLimitException,
  WalletAccessDeniedException,
} from '../../src/modules/loans/exceptions/loan.exception';

describe('LoansService', () => {
  let service: LoansService;
  let loanRepo: jest.Mocked<Partial<LoanRepository>>;
  let loanPaymentRepo: jest.Mocked<Partial<LoanPaymentRepository>>;
  let walletsService: jest.Mocked<Partial<WalletsService>>;
  let accountsService: jest.Mocked<Partial<AccountsService>>;
  let categoriesService: jest.Mocked<Partial<CategoriesService>>;
  let transactionsService: jest.Mocked<Partial<TransactionsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let dataSource: { transaction: jest.Mock };

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockFriendId = '22222222-2222-2222-2222-222222222222';
  const mockWalletId = '33333333-3333-3333-3333-333333333333';
  const mockAccountId = '44444444-4444-4444-4444-444444444444';
  const mockLoanId = '55555555-5555-5555-5555-555555555555';

  const mockLoan = {
    id: mockLoanId,
    walletId: mockWalletId,
    accountId: mockAccountId,
    createdBy: mockUserId,
    counterpartyUserId: mockFriendId,
    type: LoanType.LENT,
    contactName: 'Anh Nam Đồng Nghiệp',
    contactInfo: '0912345678',
    principalAmount: 10000000,
    remainingAmount: 3000000,
    isInterestBearing: false,
    interestRate: null,
    interestPeriod: null,
    currency: 'VND',
    note: 'Cho vay tiền',
    loanDate: new Date('2026-10-01'),
    dueDate: new Date('2026-11-01'),
    status: LoanStatus.ACTIVE,
    affectsBalance: true,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    deletedAt: null,
    payments: [],
  };

  beforeEach(async () => {
    loanRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ ...mockLoan, ...d })),
      findById: jest.fn().mockResolvedValue({ ...mockLoan }),
      findByIdWithRelations: jest.fn().mockResolvedValue({ ...mockLoan }),
      findByIdWithLock: jest.fn().mockResolvedValue({ ...mockLoan }),
      updateStatusOverdue: jest.fn().mockResolvedValue(undefined),
      findPaged: jest.fn().mockResolvedValue([[mockLoan], 1]),
      getSummary: jest.fn().mockResolvedValue({
        totalLent: 15000000,
        totalBorrowed: 4500000,
        netBalance: 10500000,
        overdueCount: 1,
        activeCount: 3,
        currency: 'VND',
      }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    loanPaymentRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) =>
        Promise.resolve({
          id: '66666666-6666-6666-6666-666666666666',
          createdAt: new Date(),
          ...d,
        }),
      ),
      findByLoanId: jest.fn().mockResolvedValue([]),
      countByLoanId: jest.fn().mockResolvedValue(0),
      findById: jest.fn().mockResolvedValue(null),
    };

    walletsService = {
      assertWalletAccess: jest.fn().mockResolvedValue(undefined),
      getUserWallets: jest
        .fn()
        .mockResolvedValue([
          { id: mockWalletId, ownerId: mockUserId, isShared: false },
        ] as any),
    };

    accountsService = {
      validateAccountForTransaction: jest.fn().mockResolvedValue({
        id: mockAccountId,
        walletId: mockWalletId,
        currency: 'VND',
        balance: 20000000,
      } as any),
      executeTransactionBalance: jest
        .fn()
        .mockResolvedValue({ balanceBefore: 20000000, balanceAfter: 15000000 }),
    };

    categoriesService = {
      findOrCreateSystemCategory: jest
        .fn()
        .mockResolvedValue({ id: 'cat-123', name: 'Cho vay' } as any),
    };

    transactionsService = {
      createSyncTransaction: jest
        .fn()
        .mockResolvedValue({ id: 'tx-123' } as any),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({} as any),
      findLatestLoanReminder: jest.fn().mockResolvedValue(null),
    };

    usersService = {
      findOne: jest.fn().mockResolvedValue({
        id: mockUserId,
        fullName: 'Nguyễn Văn A',
      } as any),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        LoanMapper,
        { provide: LoanRepository, useValue: loanRepo },
        { provide: LoanPaymentRepository, useValue: loanPaymentRepo },
        { provide: WalletsService, useValue: walletsService },
        { provide: AccountsService, useValue: accountsService },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: TransactionsService, useValue: transactionsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoans (API 1)', () => {
    it('should return paginated loans list with calculated percentages', async () => {
      const res = await service.getLoans(mockUserId, {
        walletId: mockWalletId,
        page: 1,
        limit: 20,
      });

      expect(loanRepo.updateStatusOverdue).toHaveBeenCalledWith(mockWalletId);
      expect(loanRepo.findPaged).toHaveBeenCalled();
      expect(res.items).toHaveLength(1);
      expect(res.items[0].contactName).toBe('Anh Nam Đồng Nghiệp');
      expect(res.items[0].progressPercentage).toBe(70);
      expect(res.items[0].paidAmount).toBe(7000000);
    });

    it('should fallback to user personal wallet when walletId is not provided', async () => {
      const res = await service.getLoans(mockUserId, {});
      expect(walletsService.getUserWallets).toHaveBeenCalledWith(mockUserId);
      expect(res.items).toHaveLength(1);
    });

    it('should throw WalletAccessDeniedException if user has no wallets', async () => {
      walletsService.getUserWallets!.mockResolvedValueOnce([]);
      await expect(service.getLoans(mockUserId, {})).rejects.toThrow(
        WalletAccessDeniedException,
      );
    });
  });

  describe('getSummary (API 2)', () => {
    it('should return loan summary for the wallet', async () => {
      const summary = await service.getSummary(mockUserId, mockWalletId);
      expect(summary.totalLent).toBe(15000000);
      expect(summary.totalBorrowed).toBe(4500000);
      expect(summary.netBalance).toBe(10500000);
      expect(summary.overdueCount).toBe(1);
      expect(summary.activeCount).toBe(3);
    });
  });

  describe('createLoan (API 3)', () => {
    it('should create LENT loan, deduct account balance and create dual-record transaction', async () => {
      const res = await service.createLoan(mockUserId, {
        walletId: mockWalletId,
        accountId: mockAccountId,
        type: LoanType.LENT,
        contactName: 'Anh Minh',
        principalAmount: 5000000,
        affectsBalance: true,
        counterpartyUserId: mockFriendId,
      });

      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
      expect(categoriesService.findOrCreateSystemCategory).toHaveBeenCalledWith(
        'Cho vay',
        expect.anything(),
        expect.anything(),
      );
      expect(transactionsService.createSyncTransaction).toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(res.contactName).toBeDefined();
    });

    it('should create BORROWED loan, add account balance and sync transaction', async () => {
      loanRepo.save!.mockResolvedValueOnce({
        ...mockLoan,
        type: LoanType.BORROWED,
        principalAmount: 5000000,
        remainingAmount: 5000000,
      } as any);

      await service.createLoan(mockUserId, {
        walletId: mockWalletId,
        accountId: mockAccountId,
        type: LoanType.BORROWED,
        contactName: 'Ngân hàng',
        principalAmount: 5000000,
        affectsBalance: true,
      });

      expect(categoriesService.findOrCreateSystemCategory).toHaveBeenCalledWith(
        'Đi vay',
        expect.anything(),
        expect.anything(),
      );
      expect(transactionsService.createSyncTransaction).toHaveBeenCalled();
    });

    it('should throw InvalidDueDateException if dueDate < loanDate', async () => {
      await expect(
        service.createLoan(mockUserId, {
          walletId: mockWalletId,
          accountId: mockAccountId,
          type: LoanType.LENT,
          contactName: 'Anh Nam',
          principalAmount: 1000000,
          loanDate: '2026-10-20',
          dueDate: '2026-10-10',
        }),
      ).rejects.toThrow(InvalidDueDateException);
    });
  });

  describe('getLoanById (API 4)', () => {
    it('should return loan details with recent payments', async () => {
      const res = await service.getLoanById(mockUserId, mockLoanId);
      expect(res.id).toBe(mockLoanId);
      expect(res.contactName).toBe('Anh Nam Đồng Nghiệp');
    });

    it('should throw LoanNotFoundException when loan does not exist', async () => {
      loanRepo.findByIdWithRelations!.mockResolvedValueOnce(null);
      await expect(service.getLoanById(mockUserId, 'invalid-id')).rejects.toThrow(
        LoanNotFoundException,
      );
    });
  });

  describe('updateLoan (API 5)', () => {
    it('should update loan information successfully', async () => {
      const res = await service.updateLoan(mockUserId, mockLoanId, {
        contactName: 'Anh Nam (Đã đổi SĐT)',
        note: 'Ghi chú mới',
      });

      expect(loanRepo.save).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    it('should throw CannotEditSettledLoanException if loan is already settled', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        status: LoanStatus.SETTLED,
      } as any);

      await expect(
        service.updateLoan(mockUserId, mockLoanId, { note: 'test' }),
      ).rejects.toThrow(CannotEditSettledLoanException);
    });

    it('should throw error if editing principalAmount when payments exist', async () => {
      loanPaymentRepo.countByLoanId!.mockResolvedValueOnce(2);

      await expect(
        service.updateLoan(mockUserId, mockLoanId, {
          principalAmount: 20000000,
        }),
      ).rejects.toThrow();
    });
  });

  describe('deleteLoan (API 6)', () => {
    it('should delete loan and revert account balance when 0 payments exist', async () => {
      await service.deleteLoan(mockUserId, mockLoanId);
      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
      expect(loanRepo.softDelete).toHaveBeenCalled();
    });

    it('should throw CannotDeleteLoanWithPaymentsException when payments exist', async () => {
      loanPaymentRepo.countByLoanId!.mockResolvedValueOnce(1);
      await expect(service.deleteLoan(mockUserId, mockLoanId)).rejects.toThrow(
        CannotDeleteLoanWithPaymentsException,
      );
    });
  });

  describe('remindLoan (API 7)', () => {
    it('should send reminder notification if more than 6 hours since last reminder', async () => {
      const res = await service.remindLoan(mockUserId, mockLoanId);
      expect(res.success).toBe(true);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('should throw CounterpartyNotAppUserException if loan has no counterpartyUserId', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        counterpartyUserId: null,
      } as any);

      await expect(service.remindLoan(mockUserId, mockLoanId)).rejects.toThrow(
        CounterpartyNotAppUserException,
      );
    });

    it('should throw ReminderRateLimitException if sent within 6 hours', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      notificationsService.findLatestLoanReminder!.mockResolvedValueOnce(twoHoursAgo);

      await expect(service.remindLoan(mockUserId, mockLoanId)).rejects.toThrow(
        ReminderRateLimitException,
      );
    });
  });

  describe('removeCounterparty (API 8)', () => {
    it('should allow counterparty to remove themselves and notify creator', async () => {
      const res = await service.removeCounterparty(mockFriendId, mockLoanId);
      expect(res.success).toBe(true);
      expect(loanRepo.save).toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('should throw NotCounterpartyUserException if non-counterparty attempts to remove', async () => {
      await expect(
        service.removeCounterparty('stranger-user-id', mockLoanId),
      ).rejects.toThrow(NotCounterpartyUserException);
    });
  });

  describe('recordPayment (API 9)', () => {
    it('should record payment, reduce remaining amount, update balance, and create dual-record transaction', async () => {
      const res = await service.recordPayment(mockUserId, mockLoanId, {
        accountId: mockAccountId,
        amount: 1000000,
        affectsBalance: true,
      });

      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
      expect(categoriesService.findOrCreateSystemCategory).toHaveBeenCalledWith(
        'Thu hồi nợ',
        expect.anything(),
        expect.anything(),
      );
      expect(transactionsService.createSyncTransaction).toHaveBeenCalled();
      expect(res.amount).toBe(1000000);
    });

    it('should transition loan status to SETTLED when remaining becomes 0', async () => {
      loanRepo.findByIdWithLock!.mockResolvedValueOnce({
        ...mockLoan,
        remainingAmount: 1000000,
      } as any);

      await service.recordPayment(mockUserId, mockLoanId, {
        accountId: mockAccountId,
        amount: 1000000,
      });

      expect(loanRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: LoanStatus.SETTLED, remainingAmount: 0 }),
        expect.anything(),
      );
    });

    it('should throw PaymentAmountExceedsRemainingException if payment > remaining', async () => {
      await expect(
        service.recordPayment(mockUserId, mockLoanId, {
          accountId: mockAccountId,
          amount: 5000000, // remaining is 3,000,000
        }),
      ).rejects.toThrow(PaymentAmountExceedsRemainingException);
    });

    it('should throw LoanAlreadySettledException if loan is already settled', async () => {
      loanRepo.findByIdWithLock!.mockResolvedValueOnce({
        ...mockLoan,
        status: LoanStatus.SETTLED,
        remainingAmount: 0,
      } as any);

      await expect(
        service.recordPayment(mockUserId, mockLoanId, {
          accountId: mockAccountId,
          amount: 500000,
        }),
      ).rejects.toThrow(LoanAlreadySettledException);
    });

    it('should record payment for BORROWED loan with EXPENSE transaction', async () => {
      loanRepo.findByIdWithLock!.mockResolvedValueOnce({
        ...mockLoan,
        type: LoanType.BORROWED,
        remainingAmount: 3000000,
      } as any);

      const res = await service.recordPayment(mockUserId, mockLoanId, {
        accountId: mockAccountId,
        amount: 500000,
      });

      expect(categoriesService.findOrCreateSystemCategory).toHaveBeenCalledWith(
        'Trả nợ',
        expect.anything(),
        expect.anything(),
      );
      expect(res).toBeDefined();
    });

    it('should throw LoanNotFoundException when recording payment for non-existent loan', async () => {
      loanRepo.findByIdWithLock!.mockResolvedValueOnce(null);
      await expect(
        service.recordPayment(mockUserId, mockLoanId, {
          accountId: mockAccountId,
          amount: 500000,
        }),
      ).rejects.toThrow(LoanNotFoundException);
    });
  });

  describe('getPayments (API 10)', () => {
    it('should return payments list of loan', async () => {
      loanPaymentRepo.findByLoanId!.mockResolvedValueOnce([
        {
          id: 'pay-1',
          loanId: mockLoanId,
          accountId: mockAccountId,
          amount: 1000000,
          paymentDate: new Date(),
          affectsBalance: true,
          createdAt: new Date(),
          account: { name: 'Vietcombank', icon: 'bank', currency: 'VND' },
        } as any,
      ]);

      const list = await service.getPayments(mockUserId, mockLoanId);
      expect(list).toHaveLength(1);
      expect(list[0].amount).toBe(1000000);
      expect(list[0].accountName).toBe('Vietcombank');
    });

    it('should throw LoanNotFoundException if loan does not exist', async () => {
      loanRepo.findById!.mockResolvedValueOnce(null);
      await expect(
        service.getPayments(mockUserId, 'non-existent-loan'),
      ).rejects.toThrow(LoanNotFoundException);
    });
  });

  describe('Additional edge cases', () => {
    it('createLoan throws error when account does not belong to specified wallet', async () => {
      accountsService.validateAccountForTransaction!.mockResolvedValueOnce({
        id: mockAccountId,
        walletId: 'different-wallet-id',
        currency: 'VND',
      } as any);

      await expect(
        service.createLoan(mockUserId, {
          walletId: mockWalletId,
          accountId: mockAccountId,
          type: LoanType.LENT,
          contactName: 'Test',
          principalAmount: 1000000,
        }),
      ).rejects.toThrow();
    });

    it('createLoan with dueDate in the past assigns OVERDUE status initially', async () => {
      const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pastLoanDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      await service.createLoan(mockUserId, {
        walletId: mockWalletId,
        accountId: mockAccountId,
        type: LoanType.LENT,
        contactName: 'Anh Nam Quá Hạn',
        principalAmount: 2000000,
        loanDate: pastLoanDate,
        dueDate: pastDueDate,
      });

      expect(loanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: LoanStatus.OVERDUE }),
      );
    });

    it('createLoan with INSTALLMENT does not call executeTransactionBalance', async () => {
      accountsService.executeTransactionBalance!.mockClear();

      await service.createLoan(mockUserId, {
        walletId: mockWalletId,
        accountId: mockAccountId,
        type: LoanType.INSTALLMENT,
        contactName: 'Cửa hàng điện máy',
        principalAmount: 15000000,
        affectsBalance: true,
      });

      expect(accountsService.executeTransactionBalance).not.toHaveBeenCalled();
    });

    it('updateLoan adjusts balance when modifying principalAmount without payments for LENT', async () => {
      loanPaymentRepo.countByLoanId!.mockResolvedValueOnce(0);

      await service.updateLoan(mockUserId, mockLoanId, {
        principalAmount: 12000000, // increased by 2,000,000
      });

      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
    });

    it('updateLoan adjusts balance when modifying principalAmount for BORROWED', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        type: LoanType.BORROWED,
        principalAmount: 10000000,
      } as any);
      loanPaymentRepo.countByLoanId!.mockResolvedValueOnce(0);

      await service.updateLoan(mockUserId, mockLoanId, {
        principalAmount: 8000000, // decreased by 2,000,000
      });

      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
    });

    it('updateLoan restores OVERDUE status to ACTIVE if new dueDate is in the future', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        status: LoanStatus.OVERDUE,
      } as any);

      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      await service.updateLoan(mockUserId, mockLoanId, {
        dueDate: futureDate,
      });

      expect(loanRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: LoanStatus.ACTIVE }),
      );
    });

    it('deleteLoan with BORROWED reverts balance properly', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        type: LoanType.BORROWED,
      } as any);
      loanPaymentRepo.countByLoanId!.mockResolvedValueOnce(0);

      await service.deleteLoan(mockUserId, mockLoanId);
      expect(accountsService.executeTransactionBalance).toHaveBeenCalled();
    });

    it('deleteLoan throws LoanNotFoundException if loan does not exist', async () => {
      loanRepo.findById!.mockResolvedValueOnce(null);
      await expect(service.deleteLoan(mockUserId, 'invalid')).rejects.toThrow(
        LoanNotFoundException,
      );
    });

    it('remindLoan throws error if loan type is not LENT', async () => {
      loanRepo.findById!.mockResolvedValueOnce({
        ...mockLoan,
        type: LoanType.BORROWED,
      } as any);

      await expect(service.remindLoan(mockUserId, mockLoanId)).rejects.toThrow();
    });

    it('remindLoan throws LoanNotFoundException if loan does not exist', async () => {
      loanRepo.findById!.mockResolvedValueOnce(null);
      await expect(service.remindLoan(mockUserId, 'invalid')).rejects.toThrow(
        LoanNotFoundException,
      );
    });

    it('removeCounterparty throws LoanNotFoundException if loan does not exist', async () => {
      loanRepo.findById!.mockResolvedValueOnce(null);
      await expect(
        service.removeCounterparty(mockUserId, 'invalid'),
      ).rejects.toThrow(LoanNotFoundException);
    });
  });
});
