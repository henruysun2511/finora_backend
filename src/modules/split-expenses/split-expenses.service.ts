import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExpenseSplitRepository } from './repositories/expense-split.repository';
import { SplitParticipantRepository } from './repositories/split-participant.repository';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SplitExpenseMapper } from './mapper/split-expense.mapper';
import { CreateSplitDto } from './dto/request/create-split.dto';
import { RespondSplitDto } from './dto/request/respond-split.dto';
import { RebalanceSplitDto } from './dto/request/rebalance-split.dto';
import { SplitQueryDto } from './dto/request/split-query.dto';
import { SplitResponseDto } from './dto/response/split-response.dto';
import { SplitParticipantResponseDto } from './dto/response/split-participant-response.dto';
import { MySplitsSummaryResponseDto } from './dto/response/my-splits-summary-response.dto';
import { PaginatedResponse } from '../../common/response/api-response';
import { ExpenseSplit } from './entities/expense-split.entity';
import { SplitType } from './enums/split-type.enum';
import { SplitStatus } from './enums/split-status.enum';
import { ParticipantStatus } from './enums/participant-status.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionNotFoundException } from '../transactions/exceptions/transaction.exception';
import {
  SplitExpenseNotFoundException,
  SplitAlreadyExistsException,
  InvalidSplitTotalAmountException,
  SplitConsensusNotReachedException,
  NotSplitParticipantException,
  NotSplitOwnerException,
  SplitAlreadyConfirmedException,
  SplitAlreadyCancelledException,
  CannotSplitWithSelfException,
  NotFriendsException,
  InvalidSplitActionException,
  InvalidSplitTransactionTypeException,
} from './exceptions/split-expense.exception';
import { Loan } from '../loans/entities/loan.entity';
import { LoanType } from '../loans/enums/loan-type.enum';
import { LoanStatus } from '../loans/enums/loan-status.enum';
import { NotificationType } from '../notifications/enums/notification-type.enum';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class SplitExpensesService {
  private readonly logger = new Logger(SplitExpensesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly splitRepo: ExpenseSplitRepository,
    private readonly participantRepo: SplitParticipantRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
    private readonly mapper: SplitExpenseMapper,
  ) {}

  /**
   * 1. Tạo phiên chia tiền mới cho một giao dịch chi tiêu (EXPENSE).
   */
  async createSplit(
    currentUserId: string,
    transactionId: string,
    dto: CreateSplitDto,
  ): Promise<SplitResponseDto> {
    // 1.1 Kiểm tra giao dịch tồn tại
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction || transaction.deletedAt) {
      throw new TransactionNotFoundException(transactionId);
    }

    // 1.2 Chỉ chủ giao dịch mới được tạo phiên chia tiền
    if (transaction.createdBy !== currentUserId) {
      throw new NotSplitOwnerException();
    }

    // 1.3 Chỉ cho phép chia tiền đối với giao dịch chi tiêu (EXPENSE)
    if (transaction.type !== TransactionType.EXPENSE) {
      throw new InvalidSplitTransactionTypeException();
    }

    // 1.4 Kiểm tra giao dịch đã có phiên chia tiền chưa
    const existingSplit = await this.splitRepo.findByTransactionId(transactionId);
    if (existingSplit && !existingSplit.deletedAt) {
      throw new SplitAlreadyExistsException(transactionId);
    }

    // 1.5 Kiểm tra tính hợp lệ của danh sách người tham gia
    const participantUserIds = dto.participants.map((p) => p.userId);
    if (participantUserIds.includes(currentUserId)) {
      throw new CannotSplitWithSelfException();
    }

    if (new Set(participantUserIds).size !== participantUserIds.length) {
      throw new InvalidSplitActionException(
        'Danh sách người tham gia không được chứa người dùng bị trùng lặp',
      );
    }

    // 1.6 Kiểm tra quan hệ bạn bè với tất cả người tham gia
    const nonFriendIds: string[] = [];
    for (const friendId of participantUserIds) {
      const areFriends = await this.friendsService.areFriends(
        currentUserId,
        friendId,
      );
      if (!areFriends) {
        nonFriendIds.push(friendId);
      }
    }
    if (nonFriendIds.length > 0) {
      throw new NotFriendsException(nonFriendIds);
    }

    // 1.7 Tính toán phân bổ số tiền
    const totalAmount = Number(transaction.amount);
    const splitType = dto.splitType || SplitType.EQUAL;
    const totalPeople = dto.participants.length + 1; // Bạn bè + Chủ phiên

    let ownerShare: number;
    const participantsData: Array<{ userId: string; assignedAmount: number }> =
      [];

    if (splitType === SplitType.EQUAL) {
      const baseShare = Math.floor(totalAmount / totalPeople);
      const remainder = totalAmount - baseShare * totalPeople;
      ownerShare = round2(baseShare + remainder);

      for (const p of dto.participants) {
        participantsData.push({
          userId: p.userId,
          assignedAmount: round2(baseShare),
        });
      }
    } else {
      // CUSTOM split
      let friendsSum = 0;
      for (const p of dto.participants) {
        if (!p.assignedAmount || p.assignedAmount <= 0) {
          throw new InvalidSplitActionException(
            'Số tiền phân bổ cho từng người bạn phải lớn hơn 0 khi chọn chia tùy chỉnh (CUSTOM)',
          );
        }
        const amount = round2(Number(p.assignedAmount));
        friendsSum += amount;
        participantsData.push({
          userId: p.userId,
          assignedAmount: amount,
        });
      }

      friendsSum = round2(friendsSum);
      ownerShare = round2(totalAmount - friendsSum);

      if (ownerShare < 0 || friendsSum > totalAmount) {
        throw new InvalidSplitTotalAmountException(totalAmount, friendsSum);
      }
    }

    // 1.8 Lưu dữ liệu phiên chia tiền và danh sách người tham gia trong DB Transaction
    const walletId = transaction.account.walletId;

    const savedSplit = await this.dataSource.transaction(async (manager) => {
      const splitEntity = this.splitRepo.create({
        transactionId,
        walletId,
        createdById: currentUserId,
        totalAmount,
        splitType,
        status: SplitStatus.PENDING,
      });

      const split = await this.splitRepo.save(splitEntity, manager);

      // Tạo bản ghi cho bạn bè
      const participantEntities = participantsData.map((item) =>
        this.participantRepo.create({
          splitId: split.id,
          userId: item.userId,
          assignedAmount: item.assignedAmount,
          status: ParticipantStatus.PENDING,
          isSettled: false,
        }),
      );

      // Tạo bản ghi cho chủ phiên (chủ phiên đã trả và mặc định ACCEPTED)
      const ownerParticipant = this.participantRepo.create({
        splitId: split.id,
        userId: currentUserId,
        assignedAmount: ownerShare,
        status: ParticipantStatus.ACCEPTED,
        isSettled: true,
      });

      await this.participantRepo.saveMany(
        [...participantEntities, ownerParticipant],
        manager,
      );

      return split;
    });

    // 1.9 Tải lại dữ liệu đầy đủ kèm quan hệ để trả về
    const fullSplit = await this.splitRepo.findById(savedSplit.id);

    // 1.10 Gửi thông báo cho từng người bạn tham gia
    for (const p of participantsData) {
      await this.sendNotificationSafe({
        userId: p.userId,
        type: NotificationType.SPLIT_REQUEST,
        title: 'Yêu cầu chia tiền giao dịch',
        body: `Bạn được chia ${p.assignedAmount.toLocaleString('vi-VN')} VND cho khoản chi tiêu "${transaction.category?.name || 'Chi tiêu nhóm'}".`,
        relatedEntityType: 'EXPENSE_SPLIT',
        relatedEntityId: savedSplit.id,
      });
    }

    return this.mapper.toSplitResponse(fullSplit!);
  }

  /**
   * 2. Lấy thông tin phiên chia tiền theo transactionId.
   */
  async getSplitByTransactionId(
    userId: string,
    transactionId: string,
  ): Promise<SplitResponseDto> {
    const split = await this.splitRepo.findByTransactionId(transactionId);
    if (!split) {
      throw new SplitExpenseNotFoundException(transactionId);
    }

    this.checkUserInSplit(userId, split);
    return this.mapper.toSplitResponse(split);
  }

  /**
   * 3. Lấy thông tin phiên chia tiền theo splitId.
   */
  async getSplitById(userId: string, splitId: string): Promise<SplitResponseDto> {
    const split = await this.splitRepo.findById(splitId);
    if (!split) {
      throw new SplitExpenseNotFoundException(splitId);
    }

    this.checkUserInSplit(userId, split);
    return this.mapper.toSplitResponse(split);
  }

  /**
   * 4. Lấy danh sách các phiên chia tiền của người dùng có phân trang.
   */
  async getMySplits(
    userId: string,
    query: SplitQueryDto,
  ): Promise<PaginatedResponse<SplitResponseDto>> {
    const [splits, total] = await this.splitRepo.findMySplits(userId, query);
    const dtos = this.mapper.toSplitListResponse(splits);
    return PaginatedResponse.of(dtos, total, query.page, query.limit);
  }

  /**
   * 5. Lấy thống kê tổng quan các khoản chia tiền của tôi.
   */
  async getMySplitsSummary(userId: string): Promise<MySplitsSummaryResponseDto> {
    return this.splitRepo.getSummary(userId);
  }

  /**
   * 6. Người tham gia phản hồi yêu cầu chia tiền (ACCEPT, REJECT, PROPOSE).
   */
  async respondSplit(
    userId: string,
    splitId: string,
    dto: RespondSplitDto,
  ): Promise<SplitParticipantResponseDto> {
    const split = await this.splitRepo.findById(splitId);
    if (!split) {
      throw new SplitExpenseNotFoundException(splitId);
    }

    if (split.status === SplitStatus.CONFIRMED) {
      throw new SplitAlreadyConfirmedException();
    }
    if (split.status === SplitStatus.CANCELLED) {
      throw new SplitAlreadyCancelledException();
    }

    // Không cho phép chủ phiên tự phản hồi chính mình
    if (split.createdById === userId) {
      throw new InvalidSplitActionException(
        'Chủ phiên chia tiền không thực hiện phản hồi trên endpoint này',
      );
    }

    const participant = split.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new NotSplitParticipantException();
    }

    let shouldUpdateSplitStatus = false;
    let nextSplitStatus = split.status;

    if (dto.action === 'accept') {
      participant.status = ParticipantStatus.ACCEPTED;
      if (dto.note) participant.note = dto.note;

      // Kiểm tra xem tất cả bạn bè đã ACCEPT chưa
      const friends = split.participants.filter(
        (p) => p.userId !== split.createdById && p.id !== participant.id,
      );
      const allFriendsAccepted = friends.every(
        (p) => p.status === ParticipantStatus.ACCEPTED,
      );

      if (allFriendsAccepted) {
        nextSplitStatus = SplitStatus.ALL_ACCEPTED;
        shouldUpdateSplitStatus = true;
      }
    } else if (dto.action === 'reject') {
      participant.status = ParticipantStatus.REJECTED;
      participant.note = dto.note || 'Từ chối chia khoản này';
      nextSplitStatus = SplitStatus.PENDING;
      shouldUpdateSplitStatus = true;
    } else if (dto.action === 'propose') {
      if (dto.proposedAmount === undefined || dto.proposedAmount <= 0) {
        throw new InvalidSplitActionException(
          'Số tiền đề xuất lại phải lớn hơn 0',
        );
      }
      if (dto.proposedAmount >= split.totalAmount) {
        throw new InvalidSplitActionException(
          'Số tiền đề xuất lại phải nhỏ hơn tổng số tiền của phiên chia',
        );
      }

      participant.status = ParticipantStatus.PROPOSED;
      participant.proposedAmount = round2(dto.proposedAmount);
      participant.note = dto.note;
      nextSplitStatus = SplitStatus.PENDING;
      shouldUpdateSplitStatus = true;
    }

    await this.participantRepo.save(participant);

    if (shouldUpdateSplitStatus && split.status !== nextSplitStatus) {
      split.status = nextSplitStatus;
      await this.splitRepo.save(split);
    }

    // Gửi thông báo an toàn cho chủ phiên
    const notifType =
      dto.action === 'accept'
        ? NotificationType.SPLIT_ACCEPTED
        : NotificationType.SPLIT_PROPOSAL;

    const actionText =
      dto.action === 'accept'
        ? 'đã đồng ý'
        : dto.action === 'reject'
          ? 'đã từ chối'
          : `đã đề xuất lại số tiền ${dto.proposedAmount?.toLocaleString('vi-VN')} VND`;

    await this.sendNotificationSafe({
      userId: split.createdById,
      type: notifType,
      title: 'Phản hồi chia tiền bạn bè',
      body: `Người tham gia ${actionText} cho phiên chia tiền.`,
      relatedEntityType: 'EXPENSE_SPLIT',
      relatedEntityId: split.id,
    });

    return this.mapper.toParticipantResponse(participant);
  }

  /**
   * 7. Chủ phiên điều chỉnh lại số tiền phân bổ cho các bạn bè sau khi thảo luận.
   */
  async rebalanceSplit(
    userId: string,
    splitId: string,
    dto: RebalanceSplitDto,
  ): Promise<SplitResponseDto> {
    const split = await this.splitRepo.findById(splitId);
    if (!split) {
      throw new SplitExpenseNotFoundException(splitId);
    }

    if (split.createdById !== userId) {
      throw new NotSplitOwnerException();
    }

    if (split.status === SplitStatus.CONFIRMED) {
      throw new SplitAlreadyConfirmedException();
    }
    if (split.status === SplitStatus.CANCELLED) {
      throw new SplitAlreadyCancelledException();
    }

    // Kiểm tra danh sách participants gửi lên
    const currentFriendParticipants = split.participants.filter(
      (p) => p.userId !== split.createdById,
    );
    const currentFriendUserIds = new Set(
      currentFriendParticipants.map((p) => p.userId),
    );

    if (dto.participants.length !== currentFriendParticipants.length) {
      throw new InvalidSplitActionException(
        'Danh sách người tham gia khi điều chỉnh phải khớp với danh sách bạn bè ban đầu',
      );
    }

    let friendsSum = 0;
    for (const p of dto.participants) {
      if (!currentFriendUserIds.has(p.userId)) {
        throw new InvalidSplitActionException(
          `Người dùng ID ${p.userId} không nằm trong phiên chia ban đầu`,
        );
      }
      if (!p.assignedAmount || p.assignedAmount <= 0) {
        throw new InvalidSplitActionException(
          'Số tiền phân bổ cho từng người phải lớn hơn 0',
        );
      }
      friendsSum += round2(Number(p.assignedAmount));
    }

    friendsSum = round2(friendsSum);
    const ownerShare = round2(Number(split.totalAmount) - friendsSum);

    if (ownerShare < 0 || friendsSum > Number(split.totalAmount)) {
      throw new InvalidSplitTotalAmountException(
        Number(split.totalAmount),
        friendsSum,
      );
    }

    // Cập nhật DB Transaction
    await this.dataSource.transaction(async (manager) => {
      split.splitType = SplitType.CUSTOM;
      split.status = SplitStatus.PENDING;
      await this.splitRepo.save(split, manager);

      // Cập nhật từng người bạn: reset status về PENDING, reset proposedAmount về null
      for (const pDto of dto.participants) {
        const participant = currentFriendParticipants.find(
          (p) => p.userId === pDto.userId,
        )!;
        participant.assignedAmount = round2(Number(pDto.assignedAmount));
        participant.proposedAmount = undefined;
        participant.status = ParticipantStatus.PENDING;
        await this.participantRepo.save(participant, manager);
      }

      // Cập nhật phần của chủ phiên
      const ownerParticipant = split.participants.find(
        (p) => p.userId === split.createdById,
      );
      if (ownerParticipant) {
        ownerParticipant.assignedAmount = ownerShare;
        ownerParticipant.status = ParticipantStatus.ACCEPTED;
        await this.participantRepo.save(ownerParticipant, manager);
      }
    });

    const refreshedSplit = await this.splitRepo.findById(splitId);

    // Gửi thông báo cho bạn bè về việc số tiền đã được điều chỉnh lại
    for (const pDto of dto.participants) {
      await this.sendNotificationSafe({
        userId: pDto.userId,
        type: NotificationType.SPLIT_REQUEST,
        title: 'Cập nhật lại số tiền chia',
        body: `Chủ phiên đã điều chỉnh lại số tiền chia của bạn thành ${pDto.assignedAmount.toLocaleString('vi-VN')} VND. Vui lòng xác nhận lại.`,
        relatedEntityType: 'EXPENSE_SPLIT',
        relatedEntityId: splitId,
      });
    }

    return this.mapper.toSplitResponse(refreshedSplit!);
  }

  /**
   * 8. Chốt phiên chia tiền (Chỉ khi 100% người tham gia đã ACCEPT).
   * Hệ thống tự động sinh khoản nợ phải thu (LoanType.LENT) trong module Loans.
   */
  async confirmSplit(
    userId: string,
    splitId: string,
  ): Promise<SplitResponseDto> {
    const split = await this.splitRepo.findById(splitId);
    if (!split) {
      throw new SplitExpenseNotFoundException(splitId);
    }

    if (split.createdById !== userId) {
      throw new NotSplitOwnerException();
    }

    if (split.status === SplitStatus.CONFIRMED) {
      throw new SplitAlreadyConfirmedException();
    }
    if (split.status === SplitStatus.CANCELLED) {
      throw new SplitAlreadyCancelledException();
    }

    // Kiểm tra nguyên tắc đồng thuận tuyệt đối (Consensus Rule)
    const friendParticipants = split.participants.filter(
      (p) => p.userId !== split.createdById,
    );

    const pendingCount = friendParticipants.filter(
      (p) => p.status === ParticipantStatus.PENDING,
    ).length;
    const proposedCount = friendParticipants.filter(
      (p) => p.status === ParticipantStatus.PROPOSED,
    ).length;
    const rejectedCount = friendParticipants.filter(
      (p) => p.status === ParticipantStatus.REJECTED,
    ).length;

    if (pendingCount > 0 || proposedCount > 0 || rejectedCount > 0) {
      throw new SplitConsensusNotReachedException(
        pendingCount,
        proposedCount,
        rejectedCount,
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Thực thi trong DB Transaction ACID: Chốt split và tạo các khoản Loan
    await this.dataSource.transaction(async (manager) => {
      split.status = SplitStatus.CONFIRMED;
      await this.splitRepo.save(split, manager);

      for (const p of friendParticipants) {
        const friendUser = p.user;
        const counterpartyName = friendUser?.fullName || 'Bạn bè';

        // Tạo bản ghi nợ phải thu (LENT)
        const loanEntity = manager.create(Loan, {
          walletId: split.walletId,
          accountId: split.transaction?.accountId ?? split.walletId,
          createdBy: split.createdById,
          counterpartyUserId: p.userId,
          contactName: counterpartyName,
          type: LoanType.LENT,
          principalAmount: p.assignedAmount,
          remainingAmount: p.assignedAmount,
          loanDate: new Date(),
          status: LoanStatus.ACTIVE,
          affectsBalance: false,
          note: `Chia tiền từ hóa đơn #${split.transactionId.slice(0, 8)}`,
        });

        const savedLoan = await manager.save(Loan, loanEntity);

        p.loanId = savedLoan.id;
        await this.participantRepo.save(p, manager);
      }
    });

    const confirmedSplit = await this.splitRepo.findById(splitId);

    // Gửi thông báo chốt phiên thành công cho tất cả bạn bè
    for (const p of friendParticipants) {
      await this.sendNotificationSafe({
        userId: p.userId,
        type: NotificationType.SPLIT_CONFIRMED,
        title: 'Phiên chia tiền đã được chốt',
        body: `Phiên chia tiền đã được xác nhận hoàn tất. Khoản nợ ${p.assignedAmount.toLocaleString('vi-VN')} VND đã được ghi nhận vào sổ nợ.`,
        relatedEntityType: 'EXPENSE_SPLIT',
        relatedEntityId: splitId,
      });
    }

    return this.mapper.toSplitResponse(confirmedSplit!);
  }

  /**
   * 9. Hủy phiên chia tiền.
   */
  async cancelSplit(userId: string, splitId: string): Promise<SplitResponseDto> {
    const split = await this.splitRepo.findById(splitId);
    if (!split) {
      throw new SplitExpenseNotFoundException(splitId);
    }

    if (split.createdById !== userId) {
      throw new NotSplitOwnerException();
    }

    if (split.status === SplitStatus.CONFIRMED) {
      throw new SplitAlreadyConfirmedException();
    }
    if (split.status === SplitStatus.CANCELLED) {
      throw new SplitAlreadyCancelledException();
    }

    split.status = SplitStatus.CANCELLED;
    await this.splitRepo.save(split);

    // Gửi thông báo hủy phiên cho các bạn bè
    const friends = split.participants.filter(
      (p) => p.userId !== split.createdById,
    );
    for (const p of friends) {
      await this.sendNotificationSafe({
        userId: p.userId,
        type: NotificationType.SPLIT_PROPOSAL,
        title: 'Phiên chia tiền đã bị hủy',
        body: 'Chủ phiên đã hủy phiên chia tiền này.',
        relatedEntityType: 'EXPENSE_SPLIT',
        relatedEntityId: split.id,
      });
    }

    return this.mapper.toSplitResponse(split);
  }

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

  private checkUserInSplit(userId: string, split: ExpenseSplit): void {
    const isOwner = split.createdById === userId;
    const isParticipant = (split.participants || []).some(
      (p) => p.userId === userId,
    );
    if (!isOwner && !isParticipant) {
      throw new NotSplitParticipantException();
    }
  }

  private async sendNotificationSafe(dto: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    try {
      await this.notificationsService.createNotification(dto);
    } catch (err) {
      this.logger.warn(`Không thể gửi notification cho user ${dto.userId}:`, err);
    }
  }
}
