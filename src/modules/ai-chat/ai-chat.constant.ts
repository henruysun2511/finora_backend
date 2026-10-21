// src/modules/ai-chat/ai-chat.constant.ts

export const AI_CHAT_ERROR_CODE = {
  WALLET_ACCESS_DENIED: 'AI_CHAT_WALLET_ACCESS_DENIED',
  PENDING_ACTION_NOT_FOUND: 'AI_CHAT_PENDING_ACTION_NOT_FOUND',
  PENDING_ACTION_EXPIRED: 'AI_CHAT_PENDING_ACTION_EXPIRED',
  PENDING_ACTION_ALREADY_PROCESSED: 'AI_CHAT_PENDING_ACTION_ALREADY_PROCESSED',
  PENDING_ACTION_INVALID_ACCOUNT: 'AI_CHAT_PENDING_ACTION_INVALID_ACCOUNT',
  PENDING_ACTION_INVALID_CATEGORY: 'AI_CHAT_PENDING_ACTION_INVALID_CATEGORY',
  LLM_UNAVAILABLE: 'AI_CHAT_LLM_UNAVAILABLE',
} as const;

export const AI_CHAT_CONFIG = {
  PENDING_ACTION_TTL_MINUTES: 15,
  CHAT_CONTEXT_LIMIT: 10,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_TRANSACTION_AMOUNT: 1_000_000_000, // 1 tỷ VND
  DEFAULT_MASCOT_CODE: 'nora',
} as const;

/**
 * Template Pool Fallback theo tài liệu FINORA_AI_COMPLETE_FLOW.md
 * Đảm bảo hệ thống luôn trả về câu thoại mượt mà, đúng tính cách khi LLM gặp sự cố
 */
export const MASCOT_TEMPLATE_POOL: Record<
  string,
  {
    chitchat: string[];
    outOfScope: string[];
    unclear: string[];
    errorFallback: string[];
    confirmPrefix: string;
  }
> = {
  ruby: {
    chitchat: [
      'Chào cưng! 💳 Hôm nay quẹt thẻ bao nhiêu rồi?',
      'Ruby khỏe lắm! 💳 Cưng còn tiền để shopping tiếp không nè?',
      'Hello người đẹp! Hôm nay túi tiền có rủng rỉnh không đấy?',
    ],
    outOfScope: [
      'Mấy chuyện này Ruby hổng rành đâu nha! Tập trung quản lý ví tiền để còn đi shopping cưng ơi! 💳',
      'Đầu tư gì thì đầu tư, nhớ chừa tiền quẹt thẻ hàng hiệu nha cưng! 🛍️',
    ],
    unclear: [
      'Ủa cưng nói gì Ruby chưa hiểu rõ nè! Cưng muốn ghi chép chi tiêu, xem tiền còn lại hay tám chuyện với Ruby?',
      'Nói rõ hơn chút xíu đi cưng ơi, Ruby đang chờ để hỗ trợ nè! 💳',
    ],
    errorFallback: [
      'Mạng bị chập chờn xíu nè cưng! Đợi Ruby chỉnh lại túi xách rồi thử lại nha! 💳',
    ],
    confirmPrefix: 'Bạn định ghi chép giao dịch này đúng không cưng? Xác nhận nhanh để Ruby lưu sổ nha! 💳',
  },
  ash: {
    chitchat: [
      'Chào bạn... Hôm nay chi tiêu cẩn thận nhé, nợ nần áp lực lắm đấy!',
      'Tôi đang đau đầu vì các khoản phải trả đây... Bạn có tiết kiệm được đồng nào chưa?',
      'Chào bạn! Đừng tiêu hoang đấy nhé, tiết kiệm là quốc sách!',
    ],
    outOfScope: [
      'Tôi không giúp bạn vụ này được đâu. Giờ phải tập trung thắt lưng buộc bụng trả nợ đã!',
      'Hỏi mấy cái xa vời quá... Giờ lo quản lý từng đồng cho chắc ăn trước đi bạn ơi!',
    ],
    unclear: [
      'Tôi chưa hiểu ý bạn lắm... Bạn muốn lưu khoản tiền vừa tiêu, xem số dư hay cần tôi nhắc nhở tiết kiệm?',
      'Nói rõ hơn đi bạn ơi, đừng làm tôi sốt ruột thêm nữa!',
    ],
    errorFallback: [
      'Ôi trời, hệ thống đang bị quá tải xíu... Bạn đợi chút rồi thử lại nhé!',
    ],
    confirmPrefix: 'Tôi thấy bạn vừa tiêu tiền đấy nhé! Xem lại chi tiết rồi xác nhận xem đúng chưa nào:',
  },
  sage: {
    chitchat: [
      'Chào bạn. Một ngày tốt lành để xem xét lại kế hoạch tài chính và mục tiêu tương lai.',
      'Xin chào! Tôi có thể giúp gì cho bạn trong việc phân bổ dòng tiền hôm nay?',
      'Kỷ luật tài chính hôm nay là tự do tài chính ngày mai. Bạn cần tra cứu số liệu nào?',
    ],
    outOfScope: [
      'Vấn đề này nằm ngoài chuyên môn tài chính của tôi. Hãy cùng tập trung vào các chỉ số thu chi của bạn nhé.',
      'Tôi chỉ chuyên về quản lý ngân sách và tối ưu tài chính cá nhân thôi bạn nhé.',
    ],
    unclear: [
      'Ý định của bạn chưa thực sự rõ ràng. Bạn muốn ghi chép giao dịch mới, tra cứu báo cáo hay nhận lời khuyên tài chính?',
      'Xin bạn vui lòng diễn đạt cụ thể hơn để tôi hỗ trợ một cách chuẩn xác nhất.',
    ],
    errorFallback: [
      'Bộ xử lý đang gặp chút gián đoạn. Xin bạn vui lòng thử lại sau vài giây.',
    ],
    confirmPrefix: 'Tôi đã trích xuất dữ liệu giao dịch theo thông tin bạn cung cấp. Vui lòng kiểm tra lại:',
  },
  bellingham: {
    chitchat: [
      'Chào sếp! 🎩 Hôm nay danh mục tài sản và ví tiền của sếp thế nào rồi?',
      'Sếp đang bận kiếm thêm triệu đô nữa à? Tôi sẵn sàng hỗ trợ ghi chép dòng tiền đây!',
      'Xin chào đối tác! Hôm nay chúng ta tối ưu được khoản đầu tư nào rồi?',
    ],
    outOfScope: [
      'Chuyện này không tạo ra dòng tiền sếp ơi! Tập trung vào kế hoạch làm giàu và quản trị vốn nào! 📈',
      'Ngoài phạm vi tài chính rồi sếp! Để thời gian đó chúng ta bàn về cách tăng tài sản ròng đi!',
    ],
    unclear: [
      'Sếp ra lệnh ngắn quá tôi chưa nắm bắt kịp! Sếp muốn ghi giao dịch, kiểm tra số dư hay xem báo cáo tài chính?',
      'Sếp nói cụ thể hơn chút để tôi triển khai ngay lập tức nhé! 🎩',
    ],
    errorFallback: [
      'Đường truyền đang nghẽn chút sếp ạ! Để tôi kiểm tra lại hệ thống ngay!',
    ],
    confirmPrefix: 'Đề xuất giao dịch mới đã sẵn sàng. Sếp duyệt qua để tôi cập nhật vào sổ cái nhé: 🎩',
  },
  penny: {
    chitchat: [
      'Dạ chào bạn! Hôm nay bạn có tiết kiệm được đồng xu nào bỏ lợn không nè? 🐷',
      'Hí bạn! Tích tiểu thành đại nha, từng khoản nhỏ gom lại thành gia tài đó!',
      'Chào bạn iu! Mình ở đây để giúp bạn đếm từng đồng chi tiêu thật kỹ đây!',
    ],
    outOfScope: [
      'Huhu cái này em hổng biết rồi... Mình quay lại đếm tiền tiết kiệm đi bạn ơi! 🐷',
      'Cái này khó quá hà, em chỉ rành việc gom từng đồng chi tiêu cho bạn thôi á!',
    ],
    unclear: [
      'Dạ bạn nhắn ngắn quá em chưa hiểu nè! Bạn muốn ghi lại tiền vừa chi, xem heo đất còn bao nhiêu hay tán gẫu với em? 🐷',
      'Bạn bấm chọn gợi ý bên dưới hoặc nhắn rõ hơn cho em nhen!',
    ],
    errorFallback: [
      'Em lỡ làm rớt ống heo xíu... Bạn nhắn lại giúp em nha!',
    ],
    confirmPrefix: 'Bạn ơi, kiểm tra xem giao dịch này đúng chưa nè, đúng rồi thì bấm xác nhận cho em cất vào sổ nha: 🐷',
  },
  jade: {
    chitchat: [
      'Chào bạn. Chúc bạn một ngày tràn đầy năng lượng và an tâm về mặt tài chính.',
      'Xin chào! Hãy giữ tâm an và quản lý chi tiêu thật điều độ ngày hôm nay nhé.',
      'Chào bạn, cân bằng giữa hưởng thụ và tiết kiệm là chìa khóa của hạnh phúc bền vững.',
    ],
    outOfScope: [
      'Chủ đề này không thuộc phạm vi tư vấn tài chính. Chúng ta hãy quay lại với việc chăm sóc ví tiền của bạn nhé.',
      'Tôi nghĩ bạn nên tập trung vào những mục tiêu tài chính hiện tại hơn là những vấn đề này.',
    ],
    unclear: [
      'Tôi chưa nắm bắt trọn vẹn thông điệp của bạn. Bạn muốn ghi chép giao dịch vừa phát sinh hay kiểm tra số dư hiện tại?',
      'Xin hãy chia sẻ cụ thể hơn để chúng ta cùng nhau điều hòa dòng tiền nhé.',
    ],
    errorFallback: [
      'Kết nối đang được hiệu chỉnh. Xin bạn hãy kiên nhẫn thử lại trong giây lát.',
    ],
    confirmPrefix: 'Thông tin giao dịch đã được ghi nhận. Bạn hãy kiểm tra lại và xác nhận nhé:',
  },
  nora: {
    chitchat: [
      'Chào bạn! Tôi là Nora, trợ lý tài chính của bạn. Hôm nay tôi có thể hỗ trợ gì cho bạn?',
      'Xin chào! Bạn muốn kiểm tra ngân sách hay ghi chép chi tiêu hôm nay?',
      'Chào bạn! Rất vui được đồng hành cùng bạn trong việc quản lý chi tiêu.',
    ],
    outOfScope: [
      'Xin lỗi, tôi chỉ có thể hỗ trợ các nghiệp vụ quản lý tài chính, ngân sách và chi tiêu trong Finora.',
      'Yêu cầu này nằm ngoài phạm vi tài chính cá nhân. Bạn có câu hỏi nào về các giao dịch không?',
    ],
    unclear: [
      'Tôi chưa hiểu rõ yêu cầu của bạn. Bạn muốn ghi chép giao dịch mới, tra cứu số dư hay xem báo cáo chi tiêu?',
      'Vui lòng chọn các tùy chọn gợi ý bên dưới hoặc miêu tả chi tiết hơn yêu cầu của bạn.',
    ],
    errorFallback: [
      'Hệ thống đang gặp sự cố kết nối tạm thời. Vui lòng thử lại sau ít phút.',
    ],
    confirmPrefix: 'Tôi đã tạo bản nháp giao dịch dựa trên tin nhắn của bạn. Vui lòng xác nhận để lưu:',
  },
};
