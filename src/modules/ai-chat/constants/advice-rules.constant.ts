// src/modules/ai-chat/constants/advice-rules.constant.ts
// Lời khuyên của mascot sau khi lưu giao dịch (MascotAdviceService). Rule đầu tiên khớp (theo priority giảm dần) sẽ thắng.

import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { MascotCode } from '../interfaces/ai-chat.types';

export interface AdviceContext {
  mascot: MascotCode;
  type: TransactionType;
  amount: number;
  categoryKey: string | null;
  /** Tổng chi/thu tháng hiện tại SAU khi đã lưu giao dịch (chỉ có khi rule cần). */
  monthExpense?: number | null;
  monthIncome?: number | null;
}

export interface AdviceRule {
  id: string;
  mascot: MascotCode;
  priority: number;
  needsMonthTotals?: boolean;
  when: (ctx: AdviceContext) => boolean;
  messages: string[];
}

const E = TransactionType.EXPENSE;
const I = TransactionType.INCOME;
const NON_ESSENTIAL = ['shopping', 'entertainment', 'family_gift'];

const ratio = (ctx: AdviceContext): number =>
  ctx.monthIncome && ctx.monthIncome > 0 && ctx.monthExpense != null
    ? ctx.monthExpense / ctx.monthIncome
    : 0;

export const ADVICE_RULES: AdviceRule[] = [
  // ASH — đang nợ, ưu tiên thắt chặt
  {
    id: 'ash_month_over_income',
    mascot: 'ash',
    priority: 100,
    needsMonthTotals: true,
    when: (c) => c.type === E && ratio(c) >= 0.9,
    messages: [
      'Chi tiêu tháng này đã ngốn gần hết thu nhập rồi... Đừng phát sinh thêm khoản nào nữa, còn nợ phải trả đấy!',
    ],
  },
  {
    id: 'ash_big_expense',
    mascot: 'ash',
    priority: 80,
    when: (c) => c.type === E && c.amount >= 500_000,
    messages: [
      'Khoản này không nhỏ đâu... Nợ nần còn đó, cân nhắc kỹ trước khi chi tiếp nhé!',
    ],
  },
  {
    id: 'ash_non_essential',
    mascot: 'ash',
    priority: 60,
    when: (c) =>
      c.type === E &&
      c.amount >= 150_000 &&
      !!c.categoryKey &&
      NON_ESSENTIAL.includes(c.categoryKey),
    messages: [
      'Khoản không thiết yếu trong lúc đang nợ... Cắt bớt được thì cắt nhé!',
    ],
  },
  {
    id: 'ash_income',
    mascot: 'ash',
    priority: 50,
    when: (c) => c.type === I && c.amount >= 1_000_000,
    messages: [
      'Có tiền về rồi, ưu tiên trả bớt nợ trước khi tiêu gì khác nhé!',
    ],
  },

  // PENNY — tiết kiệm từng đồng
  {
    id: 'penny_food',
    mascot: 'penny',
    priority: 70,
    when: (c) =>
      c.type === E && c.categoryKey === 'food' && c.amount >= 100_000,
    messages: [
      'Ăn ngoài hơi mạnh tay rồi nè 🐷 Mai thử nấu ở nhà để dành thêm cho heo đất nha!',
    ],
  },
  {
    id: 'penny_big',
    mascot: 'penny',
    priority: 60,
    when: (c) => c.type === E && c.amount >= 300_000,
    messages: [
      'Khoản này bằng cả mấy ngày ăn uống luôn á 🐷 Bạn cân nhắc lại chút nha!',
    ],
  },
  {
    id: 'penny_income',
    mascot: 'penny',
    priority: 50,
    when: (c) => c.type === I && c.amount >= 500_000,
    messages: [
      'Có thu nhập rồi, nhớ cất ngay 10–20% vào heo đất trước khi tiêu nha! 🐷',
    ],
  },

  // SAGE — kỷ luật, tỷ lệ
  {
    id: 'sage_month_ratio',
    mascot: 'sage',
    priority: 90,
    needsMonthTotals: true,
    when: (c) => c.type === E && ratio(c) >= 0.8,
    messages: [
      'Chi tiêu tháng này đã chạm khoảng 80% thu nhập. Nên rà soát lại các khoản không thiết yếu.',
    ],
  },
  {
    id: 'sage_entertainment',
    mascot: 'sage',
    priority: 60,
    when: (c) =>
      c.type === E && c.categoryKey === 'entertainment' && c.amount >= 500_000,
    messages: [
      'Giải trí là cần thiết, nhưng nên giữ trong khoảng 30% ngân sách theo quy tắc 50/30/20.',
    ],
  },
  {
    id: 'sage_income',
    mascot: 'sage',
    priority: 50,
    when: (c) => c.type === I && c.amount >= 1_000_000,
    messages: [
      'Gợi ý phân bổ 50/30/20: nhu cầu thiết yếu, mong muốn, và tiết kiệm/đầu tư.',
    ],
  },

  // NORA — trung tính
  {
    id: 'nora_month_ratio',
    mascot: 'nora',
    priority: 90,
    needsMonthTotals: true,
    when: (c) => c.type === E && ratio(c) >= 0.9,
    messages: ['Lưu ý: chi tiêu tháng này đã đạt trên 90% thu nhập của bạn.'],
  },
  {
    id: 'nora_big',
    mascot: 'nora',
    priority: 50,
    when: (c) => c.type === E && c.amount >= 5_000_000,
    messages: [
      'Đây là một khoản chi lớn. Bạn có thể xem lại báo cáo chi tiêu để theo dõi ngân sách.',
    ],
  },

  // JADE — cân bằng, an yên
  {
    id: 'jade_shopping',
    mascot: 'jade',
    priority: 60,
    when: (c) =>
      c.type === E && c.categoryKey === 'shopping' && c.amount >= 1_000_000,
    messages: [
      'Mua sắm có chủ đích sẽ giúp tâm an hơn. Bạn đã thật sự cần món này chưa?',
    ],
  },
  {
    id: 'jade_income',
    mascot: 'jade',
    priority: 50,
    when: (c) => c.type === I && c.amount >= 5_000_000,
    messages: [
      'Một phần thu nhập nên được dành cho mục tiêu dài hạn để lòng thêm an yên.',
    ],
  },

  // RUBY — sang chảnh, thích shopping
  {
    id: 'ruby_shopping',
    mascot: 'ruby',
    priority: 60,
    when: (c) =>
      c.type === E && c.categoryKey === 'shopping' && c.amount >= 2_000_000,
    messages: [
      'Quẹt thẻ mạnh tay ghê cưng ơi! 💳 Nhớ chừa ngân sách cho tháng sau nha!',
    ],
  },
  {
    id: 'ruby_food',
    mascot: 'ruby',
    priority: 50,
    when: (c) =>
      c.type === E && c.categoryKey === 'food' && c.amount >= 300_000,
    messages: [
      'Ăn sang quá nha cưng! 💳 Thỉnh thoảng nấu nhà cũng đáng yêu lắm đó!',
    ],
  },

  // BELLINGHAM — tycoon, tối ưu vốn
  {
    id: 'bellingham_big',
    mascot: 'bellingham',
    priority: 60,
    when: (c) => c.type === E && c.amount >= 10_000_000,
    messages: [
      'Khoản chi lớn, sếp nhớ đối chiếu với kế hoạch dòng tiền nhé! 🎩',
    ],
  },
  {
    id: 'bellingham_income',
    mascot: 'bellingham',
    priority: 50,
    when: (c) => c.type === I && c.amount >= 20_000_000,
    messages: [
      'Dòng tiền mới về — sếp cân nhắc tái đầu tư để tài sản sinh lời tiếp! 🎩',
    ],
  },
];
