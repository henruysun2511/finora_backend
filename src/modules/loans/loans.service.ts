import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { LoanRepository } from './repositories/loan.repository';
import { LoanPaymentRepository } from './repositories/loan-payment.repository';
import { LoanMapper } from './mapper/loan.mapper';

import { LoanQueryDto } from './dto/request/loan-query.dto';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { CreateLoanPaymentDto } from './dto/request/create-loan-payment.dto';

import { LoanResponseDto } from './dto/response/loan-response.dto';
import { LoanDetailResponseDto } from './dto/response/loan-detail-response.dto';
import { LoanSummaryResponseDto } from './dto/response/loan-summary-response.dto';
import { LoanPaymentResponseDto } from './dto/response/loan-payment-response.dto';

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
} from './exceptions/loan.exception';

import { LoanStatus } from './enums/loan-status.enum';
import { LoanType } from './enums/loan-type.enum';
import { LOAN_CONSTANTS, LOAN_ERROR_CODE } from './loans.constant';

import { WalletsService } from '../wallets/wallets.service';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

import { CategoryType } from '../categories/entities/category.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { PaginatedResponse } from '../../common/response/api-response';
import { AppError } from '../../common/errors/app.error';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class LoansService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly loanRepo: LoanRepository,
    private readonly loanPaymentRepo: LoanPaymentRepository,
    private readonly loanMapper: LoanMapper,
    private readonly walletsService: WalletsService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) { }

  /**
   * Xác định walletId hợp lệ: nếu không truyền từ query, tự động lấy ví cá nhân của người dùng.
   */
  private async resolveUserWalletId(
    userId: string,
    requestedWalletId?: string,
  ): Promise<string> {
    if (requestedWalletId) {
      await this.walletsService.assertWalletAccess(
        requestedWalletId,
        userId,
        'read',
      );
      return requestedWalletId;
    }

    const wallets = await this.walletsService.getUserWallets(userId);
    if (!wallets || wallets.length === 0) {
      throw new WalletAccessDeniedException();
    }

    const personal =
      wallets.find((w) => w.ownerId === userId && !w.isShared) ?? wallets[0];
    return personal.id;
  }

  async getLoans(
    userId: string,
    query: LoanQueryDto,
  ): Promise<PaginatedResponse<LoanResponseDto>> {
    const walletId = await this.resolveUserWalletId(userId, query.walletId);
    await this.walletsService.assertWalletAccess(walletId, userId, 'read');

    // Tự động kiểm tra và cập nhật trạng thái OVERDUE
    await this.loanRepo.updateStatusOverdue(walletId);

    const page =
      query.page && Number.isInteger(query.page) && query.page > 0
        ? query.page
        : LOAN_CONSTANTS.DEFAULT_PAGE;
    const limit =
      query.limit && Number.isInteger(query.limit) && query.limit > 0
        ? Math.min(query.limit, LOAN_CONSTANTS.MAX_LIMIT)
        : LOAN_CONSTANTS.DEFAULT_LIMIT;

    const [loans, total] = await this.loanRepo.findPaged(walletId, {
      type: query.type,
      status: query.status,
      search: query.search,
      page,
      limit,
    });

    const items = this.loanMapper.toResponseList(loans);
    return PaginatedResponse.of(items, total, page, limit);
  }

  async getSummary(
    userId: string,
    walletId?: string,
  ): Promise<LoanSummaryResponseDto> {
    const targetWalletId = await this.resolveUserWalletId(userId, walletId);
    await this.walletsService.assertWalletAccess(
      targetWalletId,
      userId,
      'read',
    );

    // Tự động cập nhật các khoản nợ quá hạn
    await this.loanRepo.updateStatusOverdue(targetWalletId);

    const summary = await this.loanRepo.getSummary(targetWalletId);
    return summary;
  }

  async createLoan(
    userId: string,
    dto: CreateLoanDto,
  ): Promise<LoanResponseDto> {
    // 1. Kiểm tra quyền ghi trên ví
    await this.walletsService.assertWalletAccess(dto.walletId, userId, 'write');

    // 2. Xác thực tài khoản hợp lệ
    const account = await this.accountsService.validateAccountForTransaction(
      userId,
      dto.accountId,
    );
    if (account.walletId !== dto.walletId) {
      throw new AppError({
        code: LOAN_ERROR_CODE.NOT_FOUND,
        message: 'Tài khoản không thuộc ví được chỉ định',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const loanDate = dto.loanDate ? new Date(dto.loanDate) : new Date();
    let initialStatus = LoanStatus.ACTIVE;

    if (dto.dueDate) {
      const dueDate = new Date(dto.dueDate);
      if (dueDate.getTime() < loanDate.getTime()) {
        throw new InvalidDueDateException();
      }
      if (dueDate.getTime() < Date.now()) {
        initialStatus = LoanStatus.OVERDUE;
      }
    }

    // 3. Khởi tạo Database Transaction ACID kèm Pessimistic Lock
    const savedLoan = await this.dataSource.transaction(async (manager) => {
      // 3.1 & 3.2: Kiểm tra số dư & cập nhật số dư tài khoản nếu affectsBalance = true
      if (dto.affectsBalance !== false) {
        if (dto.type === LoanType.LENT) {
          // Trừ tiền người xuất vốn
          await this.accountsService.executeTransactionBalance(
            {
              accountId: dto.accountId,
              type: TransactionType.EXPENSE,
              amount: dto.principalAmount,
            },
            manager,
          );
        } else if (dto.type === LoanType.BORROWED) {
          // Cộng tiền người đi vay
          await this.accountsService.executeTransactionBalance(
            {
              accountId: dto.accountId,
              type: TransactionType.INCOME,
              amount: dto.principalAmount,
            },
            manager,
          );
        }
        // INSTALLMENT: Không đổi số dư tiền mặt
      }

      // 3.3: Tạo bản ghi Loan
      const loanEntityData = this.loanMapper.toEntity(
        dto,
        userId,
        initialStatus,
      );
      const loan = this.loanRepo.create(loanEntityData);
      const createdLoan = await this.loanRepo.save(loan, manager);

      // 3.4: Tạo bản ghi Transaction đồng bộ (Dual-Record)
      if (dto.affectsBalance !== false && dto.type !== LoanType.INSTALLMENT) {
        const isLent = dto.type === LoanType.LENT;
        const categoryName = isLent ? 'Cho vay' : 'Đi vay';
        const categoryType = isLent
          ? CategoryType.EXPENSE
          : CategoryType.INCOME;
        const transactionType = isLent
          ? TransactionType.EXPENSE
          : TransactionType.INCOME;

        const category =
          await this.categoriesService.findOrCreateSystemCategory(
            categoryName,
            categoryType,
            manager,
          );

        await this.transactionsService.createSyncTransaction(
          {
            userId,
            accountId: dto.accountId,
            categoryId: category.id,
            type: transactionType,
            amount: dto.principalAmount,
            currency: dto.currency ?? account.currency ?? 'VND',
            name: `${categoryName}: ${dto.contactName}`,
            note: dto.note ?? `Ghi nhận khoản vay: ${dto.contactName}`,
            transactionDate: loanDate,
          },
          manager,
        );
      }

      return createdLoan;
    });

    // 4. Bắn thông báo nếu có counterpartyUserId
    if (dto.counterpartyUserId) {
      try {
        const currentUser = await this.usersService.findOne(userId);
        const isLent = dto.type === LoanType.LENT;
        const actionText = isLent ? 'cho bạn vay' : 'vay bạn';
        const formattedAmount = `${Number(dto.principalAmount).toLocaleString('vi-VN')}₫`;

        await this.notificationsService.createNotification({
          userId: dto.counterpartyUserId,
          type: NotificationType.LOAN_DUE,
          title: `Thông báo khoản vay/nợ mới từ ${currentUser.fullName}`,
          body: `${currentUser.fullName} vừa ghi nhận một khoản ${actionText} số tiền ${formattedAmount}.`,
          relatedEntityType: 'LOAN',
          relatedEntityId: savedLoan.id,
        });
      } catch {
        // Không làm hỏng transaction chính nếu việc gửi thông báo gặp sự cố
      }
    }

    return this.loanMapper.toResponse(savedLoan);
  }

  async getLoanById(
    userId: string,
    id: string,
  ): Promise<LoanDetailResponseDto> {
    const loan = await this.loanRepo.findByIdWithRelations(id);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(id);
    }

    await this.walletsService.assertWalletAccess(loan.walletId, userId, 'read');
    return this.loanMapper.toDetailResponse(loan);
  }

  async updateLoan(
    userId: string,
    id: string,
    dto: UpdateLoanDto,
  ): Promise<LoanResponseDto> {
    const loan = await this.loanRepo.findById(id);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(id);
    }

    await this.walletsService.assertWalletAccess(
      loan.walletId,
      userId,
      'write',
    );

    // Không cho phép sửa nếu đã tất toán
    if (loan.status === LoanStatus.SETTLED) {
      throw new CannotEditSettledLoanException();
    }

    // Ràng buộc sửa principalAmount: chỉ được phép khi CHƯA có đợt thanh toán nào
    if (
      dto.principalAmount !== undefined &&
      dto.principalAmount !== loan.principalAmount
    ) {
      const paymentCount = await this.loanPaymentRepo.countByLoanId(id);
      if (paymentCount > 0) {
        throw new AppError({
          code: LOAN_ERROR_CODE.CANNOT_EDIT_PRINCIPAL_WITH_PAYMENTS,
          message:
            'Không được phép sửa số tiền gốc khi khoản nợ đã phát sinh thanh toán',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      // Nếu affectsBalance = true và không phải INSTALLMENT, bù trừ lại số dư tài khoản
      if (loan.affectsBalance && loan.type !== LoanType.INSTALLMENT) {
        const diff = round2(dto.principalAmount - loan.principalAmount);
        if (diff !== 0) {
          await this.dataSource.transaction(async (manager) => {
            if (loan.type === LoanType.LENT) {
              // LENT tăng -> trừ thêm tiền (EXPENSE), LENT giảm -> hoàn lại tiền (INCOME)
              const txType =
                diff > 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
              await this.accountsService.executeTransactionBalance(
                {
                  accountId: loan.accountId,
                  type: txType,
                  amount: Math.abs(diff),
                },
                manager,
              );
            } else if (loan.type === LoanType.BORROWED) {
              // BORROWED tăng -> nhận thêm tiền (INCOME), giảm -> trả lại tiền (EXPENSE)
              const txType =
                diff > 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
              await this.accountsService.executeTransactionBalance(
                {
                  accountId: loan.accountId,
                  type: txType,
                  amount: Math.abs(diff),
                },
                manager,
              );
            }
          });
        }
      }

      loan.principalAmount = round2(dto.principalAmount);
      loan.remainingAmount = round2(dto.principalAmount);
    }

    // Cập nhật dueDate và tự động chuyển OVERDUE về ACTIVE nếu gia hạn thành công
    if (dto.dueDate !== undefined) {
      const newDueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (
        newDueDate &&
        loan.status === LoanStatus.OVERDUE &&
        newDueDate.getTime() >= Date.now()
      ) {
        loan.status = LoanStatus.ACTIVE;
      }
      loan.dueDate = newDueDate;
    }

    if (dto.contactName !== undefined) {
      loan.contactName = dto.contactName;
    }

    if (dto.contactInfo !== undefined) {
      loan.contactInfo = dto.contactInfo;
    }

    if (dto.note !== undefined) {
      loan.note = dto.note;
    }

    const saved = await this.loanRepo.save(loan);
    return this.loanMapper.toResponse(saved);
  }

  async deleteLoan(userId: string, id: string): Promise<void> {
    const loan = await this.loanRepo.findById(id);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(id);
    }

    await this.walletsService.assertWalletAccess(
      loan.walletId,
      userId,
      'write',
    );

    // Chặn xóa nếu đã phát sinh thanh toán
    const paymentCount = await this.loanPaymentRepo.countByLoanId(id);
    if (paymentCount > 0) {
      throw new CannotDeleteLoanWithPaymentsException();
    }

    await this.dataSource.transaction(async (manager) => {
      // Hoàn tác số dư nếu khi tạo có affectsBalance = true
      if (loan.affectsBalance && loan.type !== LoanType.INSTALLMENT) {
        if (loan.type === LoanType.LENT) {
          // Cho vay: hoàn lại tiền cho tài khoản (INCOME)
          await this.accountsService.executeTransactionBalance(
            {
              accountId: loan.accountId,
              type: TransactionType.INCOME,
              amount: loan.principalAmount,
            },
            manager,
          );
        } else if (loan.type === LoanType.BORROWED) {
          // Đi vay: thu hồi lại tiền đã vay (EXPENSE)
          await this.accountsService.executeTransactionBalance(
            {
              accountId: loan.accountId,
              type: TransactionType.EXPENSE,
              amount: loan.principalAmount,
            },
            manager,
          );
        }
      }

      await this.loanRepo.softDelete(id, manager);
    });
  }

  async remindLoan(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const loan = await this.loanRepo.findById(id);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(id);
    }

    await this.walletsService.assertWalletAccess(loan.walletId, userId, 'read');

    if (loan.type !== LoanType.LENT) {
      throw new AppError({
        code: LOAN_ERROR_CODE.NOT_FOUND,
        message: 'Chỉ có thể nhắc nợ đối với các khoản cho vay (LENT)',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!loan.counterpartyUserId) {
      throw new CounterpartyNotAppUserException();
    }

    if (loan.status === LoanStatus.SETTLED || loan.remainingAmount <= 0) {
      throw new LoanAlreadySettledException('Khoản nợ đã được thanh toán hết');
    }

    // Rate limiting: 6 tiếng / lần
    const lastReminderAt =
      await this.notificationsService.findLatestLoanReminder(
        loan.id,
        loan.counterpartyUserId,
      );

    if (lastReminderAt) {
      const diffMs = Date.now() - new Date(lastReminderAt).getTime();
      const sixHoursMs =
        LOAN_CONSTANTS.REMINDER_RATE_LIMIT_HOURS * 60 * 60 * 1000;
      if (diffMs < sixHoursMs) {
        const hoursRemaining = Math.ceil(
          (sixHoursMs - diffMs) / (60 * 60 * 1000),
        );
        throw new ReminderRateLimitException(hoursRemaining);
      }
    }

    const currentUser = await this.usersService.findOne(userId);
    const dueDateText = loan.dueDate
      ? new Date(loan.dueDate).toLocaleDateString('vi-VN')
      : 'sớm nhất';
    const formattedAmount = `${Number(loan.remainingAmount).toLocaleString('vi-VN')}₫`;

    await this.notificationsService.createNotification({
      userId: loan.counterpartyUserId,
      type: NotificationType.LOAN_DUE,
      title: `Nhắc nhở khoản nợ từ ${currentUser.fullName}`,
      body: `Bạn có một khoản nợ ${formattedAmount} đến hạn vào ngày ${dueDateText}. Vui lòng kiểm tra và thanh toán.`,
      relatedEntityType: 'LOAN',
      relatedEntityId: loan.id,
    });

    return {
      success: true,
      message: 'Đã gửi thông báo nhắc nợ thành công',
    };
  }

  async removeCounterparty(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const loan = await this.loanRepo.findById(id);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(id);
    }

    if (loan.counterpartyUserId !== userId) {
      throw new NotCounterpartyUserException();
    }

    loan.counterpartyUserId = null;
    await this.loanRepo.save(loan);

    try {
      const currentUser = await this.usersService.findOne(userId);
      await this.notificationsService.createNotification({
        userId: loan.createdBy,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Gỡ liên kết tài khoản khỏi khoản nợ',
        body: `${currentUser.fullName} đã gỡ liên kết tài khoản khỏi khoản nợ "${loan.contactName}".`,
        relatedEntityType: 'LOAN',
        relatedEntityId: loan.id,
      });
    } catch {
      // Bỏ qua lỗi gửi thông báo để tránh rollback thao tác gỡ
    }

    return {
      success: true,
      message: 'Đã gỡ liên kết bạn bè thành công',
    };
  }

  async recordPayment(
    userId: string,
    loanId: string,
    dto: CreateLoanPaymentDto,
  ): Promise<LoanPaymentResponseDto> {
    // 1. Xác thực tài khoản thanh toán
    const account = await this.accountsService.validateAccountForTransaction(
      userId,
      dto.accountId,
    );

    // 2. Mở ACID Transaction kèm SELECT FOR UPDATE
    const savedPayment = await this.dataSource.transaction(async (manager) => {
      const loan = await this.loanRepo.findByIdWithLock(loanId, manager);
      if (!loan || loan.deletedAt) {
        throw new LoanNotFoundException(loanId);
      }

      await this.walletsService.assertWalletAccess(
        loan.walletId,
        userId,
        'write',
      );

      if (loan.status === LoanStatus.SETTLED || loan.remainingAmount <= 0) {
        throw new LoanAlreadySettledException();
      }

      if (dto.amount > loan.remainingAmount) {
        throw new PaymentAmountExceedsRemainingException(
          dto.amount,
          loan.remainingAmount,
        );
      }

      // 2.1: Giảm trừ remainingAmount và cập nhật trạng thái nếu đã trả hết
      const newRemaining = round2(loan.remainingAmount - dto.amount);
      loan.remainingAmount = newRemaining;
      if (newRemaining <= 0) {
        loan.status = LoanStatus.SETTLED;
        loan.remainingAmount = 0;
      }
      await this.loanRepo.save(loan, manager);

      // 2.2: Tạo bản ghi loan_payments
      const paymentDate = dto.paymentDate
        ? new Date(dto.paymentDate)
        : new Date();
      const paymentEntity = this.loanPaymentRepo.create({
        loanId,
        accountId: dto.accountId,
        amount: round2(dto.amount),
        paymentDate,
        affectsBalance: dto.affectsBalance ?? true,
        note: dto.note ?? null,
      });
      const saved = await this.loanPaymentRepo.save(paymentEntity, manager);

      // 2.3: Kế toán kép (Dual-Record): Cập nhật số dư & tạo Transaction
      if (dto.affectsBalance !== false) {
        const isLent = loan.type === LoanType.LENT;
        // Cho vay: người khác trả mình -> Thu hồi nợ (INCOME)
        // Đi vay hoặc Mua trả góp: mình trả người khác -> Trả nợ (EXPENSE)
        const txType = isLent
          ? TransactionType.INCOME
          : TransactionType.EXPENSE;
        const categoryName = isLent ? 'Thu hồi nợ' : 'Trả nợ';
        const catType = isLent ? CategoryType.INCOME : CategoryType.EXPENSE;

        await this.accountsService.executeTransactionBalance(
          {
            accountId: dto.accountId,
            type: txType,
            amount: dto.amount,
          },
          manager,
        );

        const category =
          await this.categoriesService.findOrCreateSystemCategory(
            categoryName,
            catType,
            manager,
          );

        await this.transactionsService.createSyncTransaction(
          {
            userId,
            accountId: dto.accountId,
            categoryId: category.id,
            type: txType,
            amount: dto.amount,
            currency: account.currency,
            name: `${categoryName}: ${loan.contactName}`,
            note:
              dto.note ?? `${categoryName} cho khoản vay: ${loan.contactName}`,
            transactionDate: paymentDate,
          },
          manager,
        );
      }

      return saved;
    });

    // 3. Gửi thông báo Realtime nếu có liên kết bạn bè
    const loan = await this.loanRepo.findById(loanId);
    if (loan?.counterpartyUserId) {
      try {
        const formattedAmount = `${Number(dto.amount).toLocaleString('vi-VN')}₫`;
        const formattedRemaining = `${Number(loan.remainingAmount).toLocaleString('vi-VN')}₫`;

        await this.notificationsService.createNotification({
          userId: loan.counterpartyUserId,
          type: NotificationType.LOAN_PAYMENT_RECEIVED,
          title: 'Ghi nhận thanh toán khoản nợ',
          body: `Đã ghi nhận thanh toán số tiền ${formattedAmount} cho khoản nợ "${loan.contactName}". Số nợ còn lại: ${formattedRemaining}.`,
          relatedEntityType: 'LOAN',
          relatedEntityId: loan.id,
        });
      } catch {
        // Bỏ qua lỗi socket/push
      }
    }

    return this.loanMapper.toPaymentResponse(savedPayment, account.currency);
  }

  async getPayments(
    userId: string,
    loanId: string,
  ): Promise<LoanPaymentResponseDto[]> {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan || loan.deletedAt) {
      throw new LoanNotFoundException(loanId);
    }

    await this.walletsService.assertWalletAccess(loan.walletId, userId, 'read');

    const payments = await this.loanPaymentRepo.findByLoanId(loanId);
    return this.loanMapper.toPaymentResponseList(payments, loan.currency);
  }
}
