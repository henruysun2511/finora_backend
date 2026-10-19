import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionRepository } from './repositories/transaction.repository';
import { AccountsService } from '../accounts/accounts.service';
import { Transaction } from './entities/transaction.entity';
import { CategoriesService } from '../categories/categories.service';
import { BudgetsService, TransactionBudgetImpact } from '../budgets/budgets.service';
import { TransactionMapper } from './mapper/transaction.mapper';
import { CreateTransactionDto } from './dto/request/create-transaction.dto';
import { TransactionQueryDto } from './dto/request/transaction-query.dto';
import { UpdateTransactionDto } from './dto/request/update-transaction.dto';
import { DailyTransactionGridQueryDto } from './dto/request/daily-grid-query.dto';
import { TransactionResponseDto } from './dto/response/transaction-response.dto';
import {
  DailyTransactionGridResponseDto,
  DailyTransactionGroupDto,
} from './dto/response/daily-transaction-grid-response.dto';
import { PaginatedResponse } from '../../common/response/api-response';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import {
  TransactionAccessDeniedException,
  TransactionNotFoundException,
} from './exceptions/transaction.exception';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionRepo: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly mapper: TransactionMapper,
    private readonly budgetsService: BudgetsService,
  ) {}

  /**
   * Tạo giao dịch thu nhập (INCOME) hoặc chi tiêu (EXPENSE).
   * Cập nhật số dư tài khoản theo cơ chế Pessimistic Lock trong 1 DB transaction ACID.
   *
   * @param userId - UUID của người dùng thực hiện
   * @param dto - Thông tin giao dịch
   * @returns TransactionResponseDto kèm số dư sau giao dịch
   */
  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
    manager?: EntityManager,
    recurringTransactionId?: string,
  ): Promise<TransactionResponseDto> {
    // 1. Xác thực tài khoản: tồn tại, chưa lưu trữ và user có quyền ghi (OWNER / EDITOR)
    const account = await this.accountsService.validateAccountForTransaction(
      userId,
      dto.accountId,
    );

    // 2. Xác thực danh mục: tồn tại, thuộc quyền truy cập và khớp loại thu/chi
    const category = await this.categoriesService.validateCategoryForTransaction(
      dto.categoryId,
      dto.type,
      userId,
    );

    // 3. Xác định tên đại diện mặc định nếu không truyền name
    const fallbackName =
      (dto.note && dto.note.trim())
        ? dto.note.trim().slice(0, 100)
        : category.name || (dto.type === TransactionType.INCOME ? 'Khoản thu' : 'Khoản chi');

    // 4. Mở DB transaction: khóa tài khoản, cập nhật số dư & lưu giao dịch
    const execute = async (transactionManager: EntityManager) => {
      // 4.1. Cập nhật số dư tài khoản (chặn âm tiền nếu là EXPENSE)
      const { balanceAfter } = await this.accountsService.executeTransactionBalance(
        {
          accountId: dto.accountId,
          type: dto.type,
          amount: dto.amount,
        },
        transactionManager,
      );

      // 4.2. Khởi tạo & Lưu entity Transaction
      const transactionEntity = this.transactionRepo.create(
        this.mapper.toEntity(
          dto,
          userId,
          account.currency,
          fallbackName,
          recurringTransactionId,
        ),
      );
      const savedTransaction = await this.transactionRepo.save(
        transactionEntity,
        transactionManager,
      );

      savedTransaction.account = account;
      savedTransaction.category = category;

      const alerts = await this.budgetsService.syncTransactionChange(
        null,
        {
          walletId: account.walletId,
          categoryId: savedTransaction.categoryId,
          amount: savedTransaction.amount,
          currency: savedTransaction.currency,
          type: savedTransaction.type,
          transactionDate: savedTransaction.transactionDate,
        },
        transactionManager,
      );
      return {
        response: this.mapper.toResponse(savedTransaction, balanceAfter),
        alerts,
      };
    };
    const result = manager
      ? await execute(manager)
      : await this.dataSource.transaction(execute);
    await this.budgetsService.notifyBudgetAlerts(result.alerts);
    return result.response;
  }

  /**
   * Lấy danh sách giao dịch có phân trang và bộ lọc theo các tài khoản user có quyền truy cập.
   */
  async getTransactions(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedResponse<TransactionResponseDto>> {
    const accessibleAccountIds =
      await this.accountsService.getUserAccessibleAccountIds(userId);

    const [transactions, total] = await this.transactionRepo.findPaged(
      query,
      accessibleAccountIds,
    );

    const items = transactions.map((t) => this.mapper.toResponse(t));
    return PaginatedResponse.of(items, total, query.page, query.limit);
  }

  /**
   * Lấy thông tin chi tiết một giao dịch theo ID.
   */
  async getTransactionById(
    userId: string,
    id: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) throw new TransactionNotFoundException(id);

    const accessibleAccountIds =
      await this.accountsService.getUserAccessibleAccountIds(userId);

    if (!accessibleAccountIds.includes(transaction.accountId)) {
      throw new TransactionAccessDeniedException();
    }

    return this.mapper.toResponse(transaction);
  }

  /**
   * Cập nhật thông tin giao dịch.
   * Nếu có thay đổi về tiền (amount, type, accountId), tự động điều chỉnh số dư tài khoản
   * theo cơ chế Pessimistic Lock, đảm bảo tính toàn vẹn và chống Deadlock.
   *
   * @param userId - UUID người thực hiện
   * @param id - UUID giao dịch
   * @param dto - Dữ liệu cập nhật
   */
  async updateTransaction(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) throw new TransactionNotFoundException(id);

    // 1. Xác thực quyền ghi trên tài khoản hiện tại
    const currentAccount = await this.accountsService.validateAccountForTransaction(
      userId,
      transaction.accountId,
    );

    // 2. Xác thực tài khoản mới nếu có thay đổi accountId
    const targetAccountId = dto.accountId ?? transaction.accountId;
    let targetAccount = currentAccount;
    if (dto.accountId && dto.accountId !== transaction.accountId) {
      targetAccount = await this.accountsService.validateAccountForTransaction(
        userId,
        dto.accountId,
      );
    }

    // 3. Xác thực danh mục nếu có thay đổi categoryId hoặc type
    const targetType = dto.type ?? transaction.type;
    const targetCategoryId = dto.categoryId ?? transaction.categoryId;
    let targetCategory = transaction.category;
    if (dto.categoryId || dto.type) {
      targetCategory = await this.categoriesService.validateCategoryForTransaction(
        targetCategoryId,
        targetType,
        userId,
      );
    }

    // 4. Kiểm tra xem các trường tác động số dư có thay đổi không
    const targetAmount = dto.amount !== undefined ? dto.amount : transaction.amount;
    const previousImpact: TransactionBudgetImpact = {
      walletId: currentAccount.walletId,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      transactionDate: new Date(transaction.transactionDate),
    };
    const isBalanceAffected =
      targetAmount !== transaction.amount ||
      targetType !== transaction.type ||
      targetAccountId !== transaction.accountId;

    // 5. Mở DB Transaction
    const result = await this.dataSource.transaction(async (manager) => {
      let balanceAfter: number | undefined;

      if (isBalanceAffected) {
        const adjustResult = await this.accountsService.adjustTransactionBalance(
          {
            old: {
              accountId: transaction.accountId,
              type: transaction.type,
              amount: transaction.amount,
            },
            new: {
              accountId: targetAccountId,
              type: targetType,
              amount: targetAmount,
            },
          },
          manager,
        );
        balanceAfter = adjustResult.balanceAfter;
      }

      // Cập nhật các trường
      if (dto.accountId) transaction.accountId = dto.accountId;
      if (dto.categoryId) transaction.categoryId = dto.categoryId;
      if (dto.type) transaction.type = dto.type;
      if (dto.amount !== undefined) transaction.amount = dto.amount;
      if (dto.name !== undefined) transaction.name = dto.name;
      if (dto.note !== undefined) transaction.note = dto.note;
      if (dto.transactionDate !== undefined) transaction.transactionDate = dto.transactionDate;
      if (dto.source !== undefined) transaction.source = dto.source;
      if (dto.visibility !== undefined) transaction.visibility = dto.visibility;
      if (dto.amountHidden !== undefined) transaction.amountHidden = dto.amountHidden;
      if (dto.excludeFromReport !== undefined) transaction.excludeFromReport = dto.excludeFromReport;
      if (dto.locationName !== undefined) transaction.locationName = dto.locationName;
      if (dto.latitude !== undefined) transaction.latitude = dto.latitude;
      if (dto.longitude !== undefined) transaction.longitude = dto.longitude;
      if (dto.photoUrl !== undefined) transaction.photoUrl = dto.photoUrl;
      if (dto.photoType !== undefined) transaction.photoType = dto.photoType;

      transaction.currency = targetAccount.currency;

      const savedTransaction = await this.transactionRepo.save(transaction, manager);
      savedTransaction.account = targetAccount;
      savedTransaction.category = targetCategory;

      const alerts = await this.budgetsService.syncTransactionChange(
        previousImpact,
        {
          walletId: targetAccount.walletId,
          categoryId: targetCategoryId,
          amount: targetAmount,
          currency: targetAccount.currency,
          type: targetType,
          transactionDate: new Date(savedTransaction.transactionDate),
        },
        manager,
      );
      return {
        response: this.mapper.toResponse(savedTransaction, balanceAfter),
        alerts,
      };
    });
    await this.budgetsService.notifyBudgetAlerts(result.alerts);
    return result.response;
  }

  /**
   * Xóa giao dịch (Soft Delete).
   * Tự động hoàn tác số dư tài khoản tương ứng:
   * - Xóa EXPENSE: Hoàn lại tiền cho tài khoản (balance + amount).
   * - Xóa INCOME: Trừ bớt tiền khỏi tài khoản (balance - amount).
   *
   * @param userId - UUID người thực hiện
   * @param id - UUID giao dịch
   */
  async deleteTransaction(userId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) throw new TransactionNotFoundException(id);

    // Xác thực quyền ghi trên tài khoản chứa giao dịch
    const account = await this.accountsService.validateAccountForTransaction(
      userId,
      transaction.accountId,
    );

    const alerts = await this.dataSource.transaction(async (manager) => {
      // 1. Hoàn tác số dư tài khoản
      await this.accountsService.revertTransactionBalance(
        {
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
        },
        manager,
      );

      const budgetAlerts = await this.budgetsService.syncTransactionChange(
        {
          walletId: account.walletId,
          categoryId: transaction.categoryId,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          transactionDate: new Date(transaction.transactionDate),
        },
        null,
        manager,
      );

      // 2. Soft delete bản ghi giao dịch
      await this.transactionRepo.softDelete(transaction.id, manager);
      return budgetAlerts;
    });
    await this.budgetsService.notifyBudgetAlerts(alerts);
  }

  /**
   * Lấy danh sách giao dịch dạng lưới gom nhóm theo ngày.
   * Hỗ trợ lọc theo tháng/năm hoặc khoảng ngày tùy chọn, lọc theo ví/tài khoản/danh mục/loại thu chi.
   *
   * @param userId - UUID người dùng
   * @param query - Bộ lọc truy vấn
   * @returns DailyTransactionGridResponseDto
   */
  async getDailyGrid(
    userId: string,
    query: DailyTransactionGridQueryDto,
  ): Promise<DailyTransactionGridResponseDto> {
    // 1. Xác định khoảng thời gian lọc (startDate & endDate)
    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      if (query.startDate.length === 10) {
        startDate.setUTCHours(0, 0, 0, 0);
      }
      endDate = new Date(query.endDate);
      if (query.endDate.length === 10) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
    } else {
      const now = new Date();
      const year = query.year ?? now.getFullYear();
      const month = query.month ?? now.getMonth() + 1;
      const monthIndex = month - 1;

      startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    }

    // 2. Lấy danh sách tài khoản mà user có quyền truy cập (kết hợp lọc ví nếu có)
    const accessibleAccountIds =
      await this.accountsService.getUserAccessibleAccountIds(userId, query.walletId);

    // 3. Nếu lọc tài khoản cụ thể, kiểm tra xem tài khoản đó có nằm trong quyền không
    let targetAccountIds = accessibleAccountIds;
    if (query.accountId) {
      if (!accessibleAccountIds.includes(query.accountId)) {
        targetAccountIds = [];
      } else {
        targetAccountIds = [query.accountId];
      }
    }

    // 4. Lấy danh sách giao dịch trong khoảng thời gian
    const transactions = await this.transactionRepo.findForDailyGrid(targetAccountIds, {
      startDate,
      endDate,
      accountId: query.accountId,
      categoryId: query.categoryId,
      type: query.type,
      visibility: query.visibility,
    });

    // 5. Gom nhóm theo ngày và tính toán thống kê
    const dayOfWeekNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    let totalIncome = 0;
    let totalExpense = 0;

    const groupedMap = new Map<
      string,
      {
        date: string;
        dayOfWeek: string;
        totalIncome: number;
        totalExpense: number;
        transactions: any[];
      }
    >();

    for (const tx of transactions) {
      const txDate = new Date(tx.transactionDate);
      const dateKey = txDate.toISOString().split('T')[0];

      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, {
          date: dateKey,
          dayOfWeek: dayOfWeekNames[txDate.getUTCDay()],
          totalIncome: 0,
          totalExpense: 0,
          transactions: [],
        });
      }

      const group = groupedMap.get(dateKey)!;
      group.transactions.push(tx);

      const amount = Number(tx.amount) || 0;
      if (tx.type === TransactionType.INCOME) {
        group.totalIncome = round2(group.totalIncome + amount);
        totalIncome = round2(totalIncome + amount);
      } else {
        group.totalExpense = round2(group.totalExpense + amount);
        totalExpense = round2(totalExpense + amount);
      }
    }

    const days: DailyTransactionGroupDto[] = Array.from(groupedMap.values()).map((g) => ({
      date: g.date,
      dayOfWeek: g.dayOfWeek,
      totalIncome: g.totalIncome,
      totalExpense: g.totalExpense,
      netAmount: round2(g.totalIncome - g.totalExpense),
      transactions: g.transactions.map((t) => this.mapper.toResponse(t)),
    }));

    return {
      period: {
        month: query.month,
        year: query.year,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpense,
        netAmount: round2(totalIncome - totalExpense),
        totalTransactions: transactions.length,
      },
      days,
    };
  }
  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Lấy bài đăng Bảng tin (visibility = FRIENDS) của các tác giả cho trước,
   * kèm thông tin người đăng và danh mục. Dùng cho FeedService.
   */
  async findFriendsFeed(
    authorIds: string[],
    page: number,
    limit: number,
  ): Promise<[Transaction[], number]> {
    return this.transactionRepo.findFriendsFeed(authorIds, page, limit);
  }

  /**
   * [CROSS-MODULE] Tìm entity Transaction theo ID (bỏ qua bản ghi đã xóa mềm).
   * Dùng cho FeedService kiểm tra bài đăng trước khi thả reaction / chỉnh sửa.
   */
  async findEntityById(id: string): Promise<Transaction | null> {
    return this.transactionRepo.findById(id);
  }

  async findByRecurringId(recurringTransactionId: string): Promise<Transaction[]> {
    return this.transactionRepo.findByRecurringId(recurringTransactionId);
  }

  /**
   * [CROSS-MODULE] Lưu entity Transaction đã chỉnh sửa các trường hiển thị
   * (visibility, amountHidden, note). Dùng cho FeedService.updatePost.
   */
  async saveEntity(transaction: Transaction): Promise<Transaction> {
    return this.transactionRepo.save(transaction);
  }
}
