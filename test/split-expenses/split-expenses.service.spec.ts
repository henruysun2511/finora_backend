/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SplitExpensesService } from '../../src/modules/split-expenses/split-expenses.service';
import { ExpenseSplitRepository } from '../../src/modules/split-expenses/repositories/expense-split.repository';
import { SplitParticipantRepository } from '../../src/modules/split-expenses/repositories/split-participant.repository';
import { TransactionRepository } from '../../src/modules/transactions/repositories/transaction.repository';
import { FriendsService } from '../../src/modules/friends/friends.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { SplitExpenseMapper } from '../../src/modules/split-expenses/mapper/split-expense.mapper';
import { SplitType } from '../../src/modules/split-expenses/enums/split-type.enum';
import { SplitStatus } from '../../src/modules/split-expenses/enums/split-status.enum';
import { ParticipantStatus } from '../../src/modules/split-expenses/enums/participant-status.enum';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';
import {
  CannotSplitWithSelfException,
  InvalidSplitTotalAmountException,
  NotFriendsException,
  NotSplitOwnerException,
  NotSplitParticipantException,
  SplitAlreadyConfirmedException,
  SplitConsensusNotReachedException,
  InvalidSplitTransactionTypeException,
} from '../../src/modules/split-expenses/exceptions/split-expense.exception';
import { LoanType } from '../../src/modules/loans/enums/loan-type.enum';

describe('SplitExpensesService', () => {
  let service: SplitExpensesService;
  let splitRepo: any;
  let participantRepo: any;
  let transactionRepo: any;
  let friendsService: any;
  let notificationsService: any;
  let mockDataSource: any;

  const OWNER_ID = 'owner-uuid';
  const FRIEND_A = 'friend-a-uuid';
  const FRIEND_B = 'friend-b-uuid';
  const STRANGER = 'stranger-uuid';
  const TRANSACTION_ID = 'transaction-uuid';
  const WALLET_ID = 'wallet-uuid';
  const SPLIT_ID = 'split-uuid';

  beforeEach(async () => {
    mockDataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          save: jest.fn(async (_entityClass, data) => ({
            id: 'loan-uuid-generated',
            ...data,
          })),
          create: jest.fn((_entityClass, data) => ({
            id: 'loan-uuid-generated',
            ...data,
          })),
        };
        return cb(manager);
      }),
    };

    splitRepo = {
      create: jest.fn((dto) => ({ id: SPLIT_ID, ...dto })),
      save: jest.fn(async (dto) => ({ id: SPLIT_ID, ...dto })),
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      findMySplits: jest.fn().mockResolvedValue([[], 0]),
      getSummary: jest.fn().mockResolvedValue({
        pendingRequestsCount: 0,
        totalOwedToMe: 0,
        totalIOwe: 0,
      }),
    };

    participantRepo = {
      create: jest.fn((dto) => ({ id: `participant-${Math.random()}`, ...dto })),
      save: jest.fn(async (dto) => dto),
      saveMany: jest.fn(async (dtos) => dtos),
      findById: jest.fn(),
      findBySplitAndUser: jest.fn(),
      findBySplitId: jest.fn(),
      deleteBySplitId: jest.fn(),
    };

    transactionRepo = {
      findById: jest.fn().mockResolvedValue({
        id: TRANSACTION_ID,
        amount: 100000,
        type: TransactionType.EXPENSE,
        createdBy: OWNER_ID,
        account: { walletId: WALLET_ID },
        category: { name: 'Ăn uống' },
      }),
    };

    friendsService = {
      areFriends: jest.fn(async (userA, userB) => {
        if (userB === STRANGER) return false;
        return true;
      }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitExpensesService,
        SplitExpenseMapper,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ExpenseSplitRepository, useValue: splitRepo },
        { provide: SplitParticipantRepository, useValue: participantRepo },
        { provide: TransactionRepository, useValue: transactionRepo },
        { provide: FriendsService, useValue: friendsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<SplitExpensesService>(SplitExpensesService);
  });

  describe('createSplit', () => {
    it('chia đều (EQUAL): 100.000 chia cho 3 người (chủ + 2 bạn) -> mỗi bạn 33.333, chủ chịu dôi 33.334', async () => {
      splitRepo.findById.mockImplementation(async () => ({
        id: SPLIT_ID,
        transactionId: TRANSACTION_ID,
        walletId: WALLET_ID,
        createdById: OWNER_ID,
        totalAmount: 100000,
        splitType: SplitType.EQUAL,
        status: SplitStatus.PENDING,
        participants: [
          {
            id: 'part-a',
            splitId: SPLIT_ID,
            userId: FRIEND_A,
            assignedAmount: 33333,
            status: ParticipantStatus.PENDING,
            isSettled: false,
          },
          {
            id: 'part-b',
            splitId: SPLIT_ID,
            userId: FRIEND_B,
            assignedAmount: 33333,
            status: ParticipantStatus.PENDING,
            isSettled: false,
          },
          {
            id: 'part-owner',
            splitId: SPLIT_ID,
            userId: OWNER_ID,
            assignedAmount: 33334,
            status: ParticipantStatus.ACCEPTED,
            isSettled: true,
          },
        ],
      }));

      const result = await service.createSplit(OWNER_ID, TRANSACTION_ID, {
        splitType: SplitType.EQUAL,
        participants: [{ userId: FRIEND_A }, { userId: FRIEND_B }],
      });

      expect(result).toBeDefined();
      expect(result.totalAmount).toBe(100000);
      expect(result.participants).toHaveLength(3);

      const ownerPart = result.participants.find((p) => p.userId === OWNER_ID);
      const friendAPart = result.participants.find((p) => p.userId === FRIEND_A);

      expect(ownerPart?.assignedAmount).toBe(33334);
      expect(friendAPart?.assignedAmount).toBe(33333);
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('báo lỗi CannotSplitWithSelfException nếu danh sách bạn bè có chứa ID của chủ phiên', async () => {
      await expect(
        service.createSplit(OWNER_ID, TRANSACTION_ID, {
          splitType: SplitType.EQUAL,
          participants: [{ userId: OWNER_ID }],
        }),
      ).rejects.toThrow(CannotSplitWithSelfException);
    });

    it('báo lỗi NotFriendsException nếu có người tham gia chưa phải là bạn bè', async () => {
      await expect(
        service.createSplit(OWNER_ID, TRANSACTION_ID, {
          splitType: SplitType.EQUAL,
          participants: [{ userId: STRANGER }],
        }),
      ).rejects.toThrow(NotFriendsException);
    });

    it('báo lỗi NotSplitOwnerException nếu người tạo không phải chủ giao dịch', async () => {
      await expect(
        service.createSplit('other-user', TRANSACTION_ID, {
          splitType: SplitType.EQUAL,
          participants: [{ userId: FRIEND_A }],
        }),
      ).rejects.toThrow(NotSplitOwnerException);
    });

    it('báo lỗi InvalidSplitTransactionTypeException nếu giao dịch không phải EXPENSE', async () => {
      transactionRepo.findById.mockResolvedValueOnce({
        id: TRANSACTION_ID,
        amount: 50000,
        type: TransactionType.INCOME,
        createdBy: OWNER_ID,
      });

      await expect(
        service.createSplit(OWNER_ID, TRANSACTION_ID, {
          splitType: SplitType.EQUAL,
          participants: [{ userId: FRIEND_A }],
        }),
      ).rejects.toThrow(InvalidSplitTransactionTypeException);
    });

    it('báo lỗi InvalidSplitTotalAmountException khi chia CUSTOM mà tổng bạn bè vượt quá hóa đơn', async () => {
      await expect(
        service.createSplit(OWNER_ID, TRANSACTION_ID, {
          splitType: SplitType.CUSTOM,
          participants: [{ userId: FRIEND_A, assignedAmount: 120000 }],
        }),
      ).rejects.toThrow(InvalidSplitTotalAmountException);
    });
  });

  describe('respondSplit', () => {
    let mockSplit: any;

    beforeEach(() => {
      mockSplit = {
        id: SPLIT_ID,
        createdById: OWNER_ID,
        totalAmount: 100000,
        status: SplitStatus.PENDING,
        participants: [
          {
            id: 'p-owner',
            splitId: SPLIT_ID,
            userId: OWNER_ID,
            assignedAmount: 50000,
            status: ParticipantStatus.ACCEPTED,
          },
          {
            id: 'p-friend',
            splitId: SPLIT_ID,
            userId: FRIEND_A,
            assignedAmount: 50000,
            status: ParticipantStatus.PENDING,
          },
        ],
      };
      splitRepo.findById.mockResolvedValue(mockSplit);
    });

    it('bạn bè chấp thuận (ACCEPT) và chuyển phiên sang ALL_ACCEPTED khi tất cả đã đồng ý', async () => {
      const res = await service.respondSplit(FRIEND_A, SPLIT_ID, {
        action: 'accept',
      });

      expect(res.status).toBe(ParticipantStatus.ACCEPTED);
      expect(mockSplit.status).toBe(SplitStatus.ALL_ACCEPTED);
      expect(splitRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SplitStatus.ALL_ACCEPTED }),
      );
    });

    it('bạn bè đề xuất lại số tiền (PROPOSE)', async () => {
      const res = await service.respondSplit(FRIEND_A, SPLIT_ID, {
        action: 'propose',
        proposedAmount: 40000,
        note: 'Bữa trưa mình ăn ít hơn',
      });

      expect(res.status).toBe(ParticipantStatus.PROPOSED);
      expect(res.proposedAmount).toBe(40000);
      expect(res.note).toBe('Bữa trưa mình ăn ít hơn');
    });

    it('báo lỗi NotSplitParticipantException nếu người phản hồi không nằm trong phiên chia', async () => {
      await expect(
        service.respondSplit(STRANGER, SPLIT_ID, { action: 'accept' }),
      ).rejects.toThrow(NotSplitParticipantException);
    });
  });

  describe('confirmSplit (Consensus Rule & Debt creation)', () => {
    it('chặn chốt phiên nếu còn người chưa đồng ý (PENDING)', async () => {
      splitRepo.findById.mockResolvedValue({
        id: SPLIT_ID,
        createdById: OWNER_ID,
        status: SplitStatus.PENDING,
        participants: [
          { userId: OWNER_ID, status: ParticipantStatus.ACCEPTED },
          { userId: FRIEND_A, status: ParticipantStatus.PENDING },
        ],
      });

      await expect(service.confirmSplit(OWNER_ID, SPLIT_ID)).rejects.toThrow(
        SplitConsensusNotReachedException,
      );
    });

    it('chốt phiên thành công khi 100% đồng thuận: tạo khoản nợ LoanType.LENT và cập nhật CONFIRMED', async () => {
      const participantA = {
        id: 'p-a',
        userId: FRIEND_A,
        assignedAmount: 50000,
        status: ParticipantStatus.ACCEPTED,
        loanId: undefined,
        user: { fullName: 'Friend A' },
      };

      const splitData = {
        id: SPLIT_ID,
        transactionId: TRANSACTION_ID,
        walletId: WALLET_ID,
        createdById: OWNER_ID,
        status: SplitStatus.ALL_ACCEPTED,
        participants: [
          { userId: OWNER_ID, status: ParticipantStatus.ACCEPTED },
          participantA,
        ],
      };

      splitRepo.findById.mockResolvedValue(splitData);

      const result = await service.confirmSplit(OWNER_ID, SPLIT_ID);

      expect(splitData.status).toBe(SplitStatus.CONFIRMED);
      expect(participantA.loanId).toBe('loan-uuid-generated');
      expect(result).toBeDefined();
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });
  });

  describe('cancelSplit', () => {
    it('chủ phiên hủy phiên chia thành công', async () => {
      const mockSplit = {
        id: SPLIT_ID,
        createdById: OWNER_ID,
        status: SplitStatus.PENDING,
        participants: [
          { userId: OWNER_ID, status: ParticipantStatus.ACCEPTED },
          { userId: FRIEND_A, status: ParticipantStatus.PENDING },
        ],
      };
      splitRepo.findById.mockResolvedValue(mockSplit);

      const result = await service.cancelSplit(OWNER_ID, SPLIT_ID);
      expect(result.status).toBe(SplitStatus.CANCELLED);
    });

    it('báo lỗi SplitAlreadyConfirmedException nếu cố hủy phiên đã CONFIRMED', async () => {
      splitRepo.findById.mockResolvedValue({
        id: SPLIT_ID,
        createdById: OWNER_ID,
        status: SplitStatus.CONFIRMED,
        participants: [],
      });

      await expect(service.cancelSplit(OWNER_ID, SPLIT_ID)).rejects.toThrow(
        SplitAlreadyConfirmedException,
      );
    });
  });
});
