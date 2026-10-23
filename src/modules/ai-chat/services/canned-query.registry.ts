// src/modules/ai-chat/services/canned-query.registry.ts
import { Injectable, Logger } from '@nestjs/common';
import { TransactionsService } from '../../transactions/transactions.service';
import { AccountsService } from '../../accounts/accounts.service';
import { ChatMessageType } from '../enums/chat-message-type.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

export enum CannedQueryFunction {
  GET_SPENDING_SUMMARY = 'get_spending_summary',
  GET_WALLET_BALANCES = 'get_wallet_balances',
  GET_TOP_CATEGORIES = 'get_top_categories',
}

export interface CannedQueryDefinition {
  name: CannedQueryFunction;
  description: string;
  parameters: Record<string, any>;
}

export interface ExecuteCannedQueryResult {
  messageType: ChatMessageType;
  textContent: string;
  payloadJson: Record<string, any>;
}

@Injectable()
export class CannedQueryRegistry {
  private readonly logger = new Logger(CannedQueryRegistry.name);

  // Danh mục các hàm truy vấn định sẵn (Canned Queries) được cấp phép trong hệ thống
  private readonly definitions: CannedQueryDefinition[] = [
    {
      name: CannedQueryFunction.GET_SPENDING_SUMMARY,
      description:
        'Tra cứu tổng chi tiêu, tổng thu nhập và cơ cấu chi tiêu theo từng danh mục (Pie Chart) trong khoảng thời gian: hôm nay, tuần này, tháng này, tháng trước.',
      parameters: {
        type: 'OBJECT',
        properties: {
          timeRange: {
            type: 'STRING',
            enum: ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH'],
            description: 'Khoảng thời gian muốn thống kê chi tiêu (mặc định: THIS_MONTH)',
          },
          categoryName: {
            type: 'STRING',
            description: 'Tên danh mục cần lọc cụ thể nếu có (ví dụ: Ăn uống, Đi lại)',
          },
        },
      },
    },
    {
      name: CannedQueryFunction.GET_WALLET_BALANCES,
      description:
        'Tra cứu số dư của tất cả các tài khoản trong ví và tổng tiền hiện có (Stat Card).',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: CannedQueryFunction.GET_TOP_CATEGORIES,
      description:
        'Tra cứu top các danh mục chi tiêu tốn nhiều tiền nhất trong tháng (Bar Chart).',
      parameters: {
        type: 'OBJECT',
        properties: {
          timeRange: {
            type: 'STRING',
            enum: ['THIS_MONTH', 'LAST_MONTH'],
            description: 'Khoảng thời gian thống kê top danh mục (mặc định: THIS_MONTH)',
          },
          limit: {
            type: 'NUMBER',
            description: 'Số lượng danh mục cần lấy (mặc định: 5)',
          },
        },
      },
    },
  ];

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Lấy danh sách định nghĩa các hàm truy vấn gửi cho LLM
   */
  getDefinitions(): CannedQueryDefinition[] {
    return this.definitions;
  }

  /**
   * Kiểm tra xem tên hàm truy vấn có được hệ thống hỗ trợ hay không
   */
  isSupported(functionName: string): boolean {
    return Object.values(CannedQueryFunction).includes(functionName as CannedQueryFunction);
  }

  /**
   * Thực thi hàm Canned Query được chỉ định
   */
  async execute(params: {
    functionName: string;
    args: Record<string, any>;
    userId: string;
    walletId: string;
    mascotCode: string;
  }): Promise<ExecuteCannedQueryResult> {
    const { functionName, args, userId, walletId, mascotCode } = params;

    switch (functionName) {
      case CannedQueryFunction.GET_SPENDING_SUMMARY:
        return this.executeSpendingSummary(userId, walletId, mascotCode, args);

      case CannedQueryFunction.GET_WALLET_BALANCES:
        return this.executeWalletBalances(userId, walletId, mascotCode);

      case CannedQueryFunction.GET_TOP_CATEGORIES:
        return this.executeTopCategories(userId, walletId, mascotCode, args);

      default:
        return this.getUnsupportedQueryResult(functionName, mascotCode);
    }
  }

  /**
   * Trả về kết quả thông báo khi người dùng yêu cầu hàm truy vấn chưa hỗ trợ
   */
  getUnsupportedQueryResult(
    functionName: string,
    mascotCode: string,
  ): ExecuteCannedQueryResult {
    let textContent =
      'Finora hiện chưa hỗ trợ chức năng tra cứu này. Hiện tại tôi có thể giúp bạn: ' +
      'xem cơ cấu chi tiêu tháng này, tra cứu số dư ví, hoặc xem top danh mục chi nhiều nhất.';

    if (mascotCode === 'ruby') {
      textContent =
        'Ủa chức năng tra cứu này Ruby chưa hỗ trợ nè cưng! 💳 ' +
        'Cưng có thể xem biểu đồ chi tiêu tháng, kiểm tra số dư ví hoặc top danh mục ngốn tiền nha!';
    } else if (mascotCode === 'ash') {
      textContent =
        'Hệ thống chưa hỗ trợ tra cứu mục này đâu bạn ơi... ' +
        'Hãy tập trung kiểm tra chi tiêu tháng này hoặc xem lại số dư ví trước đã nhé!';
    } else if (mascotCode === 'penny') {
      textContent =
        'Dạ mục này em chưa có số liệu rồi nè 🐷. ' +
        'Bạn có muốn xem tổng chi tiêu hay đếm xem các tài khoản còn bao nhiêu tiền hông?';
    } else if (mascotCode === 'bellingham') {
      textContent =
        'Báo cáo mục này chưa có trong danh mục sếp ơi! 🎩 ' +
        'Tôi có thể xuất ngay báo cáo chi tiêu tháng hoặc tổng số dư tài sản cho sếp!';
    }

    return {
      messageType: ChatMessageType.TEXT,
      textContent,
      payloadJson: {
        supportedQueries: this.definitions.map((d) => ({
          name: d.name,
          description: d.description,
        })),
      },
    };
  }

  // ── [CANNED QUERY 1: TỔNG QUAN CHI TIÊU] ────────────────────────────────────

  private async executeSpendingSummary(
    userId: string,
    walletId: string,
    mascotCode: string,
    args: Record<string, any>,
  ): Promise<ExecuteCannedQueryResult> {
    const timeRange = args.timeRange || 'THIS_MONTH';
    const now = new Date();
    const queryMonth = now.getUTCMonth() + 1;
    const queryYear = now.getUTCFullYear();

    const gridData = await this.transactionsService.getDailyGrid(userId, {
      month: queryMonth,
      year: queryYear,
      walletId,
    });

    const summary = gridData?.summary || {
      totalExpense: 0,
      totalIncome: 0,
      totalTransactions: 0,
    };
    const totalExpense = summary.totalExpense || 0;
    const totalIncome = summary.totalIncome || 0;

    const formattedExpense = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(totalExpense);

    // Tính tổng từng danh mục
    const categoryTotals: Record<string, { label: string; value: number }> = {};
    if (Array.isArray(gridData?.days)) {
      for (const day of gridData.days) {
        if (Array.isArray(day.transactions)) {
          for (const tx of day.transactions) {
            if (tx.type === TransactionType.EXPENSE) {
              const catName = tx.categoryName || 'Khác';
              const amt = Number(tx.amount) || 0;
              if (!categoryTotals[catName]) {
                categoryTotals[catName] = { label: catName, value: 0 };
              }
              categoryTotals[catName].value += amt;
            }
          }
        }
      }
    }

    const data = Object.values(categoryTotals).map((item) => ({
      label: item.label,
      value: item.value,
      percentage: totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0,
    }));

    let textContent = `Trong tháng này, bạn đã chi tiêu ${formattedExpense} trên tổng số ${summary.totalTransactions || 0} giao dịch.`;
    if (mascotCode === 'ruby') {
      textContent = `Tháng này cưng quẹt thẻ hết ${formattedExpense} rồi đó nha! 💳 Xem biểu đồ bên dưới để biết tiền trôi về đâu nè!`;
    } else if (mascotCode === 'ash') {
      textContent = `Tháng này bạn đã tiêu ${formattedExpense} rồi... Cần thắt lưng buộc bụng lại ngay nhé!`;
    } else if (mascotCode === 'penny') {
      textContent = `Tháng này bạn đã tiêu hết ${formattedExpense} rồi nè. Xem biểu đồ để tiết kiệm hơn nha! 🐷`;
    }

    return {
      messageType: ChatMessageType.CHART_PIE,
      textContent,
      payloadJson: {
        chartType: 'pie',
        functionName: CannedQueryFunction.GET_SPENDING_SUMMARY,
        timeRange,
        totalExpense,
        totalIncome,
        summary: gridData?.summary,
        period: gridData?.period,
        data,
      },
    };
  }

  // ── [CANNED QUERY 2: SỐ DƯ TÀI KHOẢN VÍ] ───────────────────────────────────

  private async executeWalletBalances(
    userId: string,
    walletId: string,
    mascotCode: string,
  ): Promise<ExecuteCannedQueryResult> {
    const accountsPage = await this.accountsService.listAccounts(userId, {
      walletId,
      page: 1,
      limit: 50,
      isArchived: false,
    } as any);

    const accounts = accountsPage.items || [];
    const totalBalance = accounts.reduce(
      (sum, a) => sum + (Number(a.balance) || 0),
      0,
    );

    const formattedTotal = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(totalBalance);

    let textContent = `Tổng số dư các tài khoản trong ví hiện tại là: ${formattedTotal}.`;
    if (mascotCode === 'ruby') {
      textContent = `Ví của cưng đang có tổng cộng ${formattedTotal} nè! 💳 Đủ ngân sách để tiếp tục săn deal không cưng?`;
    } else if (mascotCode === 'ash') {
      textContent = `Số dư hiện tại là ${formattedTotal}. Nhớ giữ tiền phòng thủ, đừng tiêu hết đấy!`;
    } else if (mascotCode === 'bellingham') {
      textContent = `Báo cáo số dư tài sản khả dụng của sếp: ${formattedTotal}. Sẵn sàng phân bổ dòng tiền mới! 🎩`;
    } else if (mascotCode === 'penny') {
      textContent = `Heo đất của bạn đang có tổng cộng ${formattedTotal} nè! 🐷 Tích tiểu thành đại nha!`;
    }

    return {
      messageType: ChatMessageType.STAT_CARD,
      textContent,
      payloadJson: {
        functionName: CannedQueryFunction.GET_WALLET_BALANCES,
        totalBalance,
        totalBalanceFormatted: formattedTotal,
        accountCount: accounts.length,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          balance: a.balance,
          currency: a.currency,
        })),
      },
    };
  }

  // ── [CANNED QUERY 3: TOP DANH MỤC CHI TIÊU] ─────────────────────────────────

  private async executeTopCategories(
    userId: string,
    walletId: string,
    mascotCode: string,
    args: Record<string, any>,
  ): Promise<ExecuteCannedQueryResult> {
    const limit = Math.min(Number(args.limit) || 5, 10);
    const now = new Date();
    const queryMonth = now.getUTCMonth() + 1;
    const queryYear = now.getUTCFullYear();

    const gridData = await this.transactionsService.getDailyGrid(userId, {
      month: queryMonth,
      year: queryYear,
      walletId,
    });

    const categoryTotals: Record<string, { label: string; value: number }> = {};
    if (Array.isArray(gridData?.days)) {
      for (const day of gridData.days) {
        if (Array.isArray(day.transactions)) {
          for (const tx of day.transactions) {
            if (tx.type === TransactionType.EXPENSE) {
              const catName = tx.categoryName || 'Khác';
              const amt = Number(tx.amount) || 0;
              if (!categoryTotals[catName]) {
                categoryTotals[catName] = { label: catName, value: 0 };
              }
              categoryTotals[catName].value += amt;
            }
          }
        }
      }
    }

    // Sắp xếp giảm dần và lấy top N danh mục
    const sortedCategories = Object.values(categoryTotals)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    let textContent = `Dưới đây là top ${sortedCategories.length} danh mục bạn chi tiêu nhiều nhất trong tháng:`;
    if (mascotCode === 'ruby') {
      textContent = `Đây nè cưng! Top ${sortedCategories.length} khoản ngốn nhiều tiền nhất tháng này của cưng đây: 💳`;
    } else if (mascotCode === 'ash') {
      textContent = `Xem kỹ top ${sortedCategories.length} danh mục này để biết chỗ nào cần cắt giảm ngay lập tức nhé!`;
    }

    return {
      messageType: ChatMessageType.CHART_BAR,
      textContent,
      payloadJson: {
        chartType: 'bar',
        functionName: CannedQueryFunction.GET_TOP_CATEGORIES,
        limit,
        data: sortedCategories,
      },
    };
  }
}
