// src/modules/ai-chat/constants/mascot-templates.constant.ts
// Template pool cho 7 mascot (ai-flow.md). Số liệu luôn được điền bằng biến {…} để đảm bảo chính xác tuyệt đối.
// Biến dùng chung: {name} {amount} {category} {total} {count} {period} {top} {delta} {pct} {balance} {accounts} {previous}

import { MascotCode } from '../interfaces/ai-chat.types';

export interface MascotVoice {
  chitchat: string[];
  advice: string[]; // trả lời khi người dùng xin lời khuyên tài chính chung
  outOfScope: string[];
  unclear: string[];
  error: string[];
  confirm: string[];
  saved: string[];
  rejected: string[];
  expired: string[];
  needAmount: string[];
  amountTooLarge: string[];
  spending: string[];
  spendingCategory: string[];
  balance: string[];
  top: string[];
  compareUp: string[];
  compareDown: string[];
  compareSame: string[];
  recent: string[];
  noData: string[];
  unsupported: string[];
}

export const MASCOT_VOICES: Record<MascotCode, MascotVoice> = {
  ruby: {
    chitchat: [
      'Chào cưng! 💳 Hôm nay quẹt thẻ bao nhiêu rồi?',
      'Ruby khỏe lắm! 💳 Cưng còn tiền để shopping tiếp không nè?',
      'Hello người đẹp! Hôm nay túi tiền có rủng rỉnh không đấy?',
    ],
    advice: [
      'Gợi ý chi tiết để chi tiêu tiết kiệm mà vẫn giữ chất sống sang chảnh của Ruby nè cưng! 💳✨\n\n1. Trích quỹ tích lũy trước: Ngay khi có tiền vào ví, trích ngay 20-30% sang quỹ tiết kiệm/đầu tư rồi mới shopping.\n2. Quy tắc 24h & Đầu tư chất lượng: Tránh mua đồ rẻ mau hỏng. Hãy chọn đồ tốt thực sự cần và hoãn 24h trước khi chốt đơn những món mua theo cảm xúc.\n3. Cài đặt Hạn mức Ngân sách trên Finora: Chia nhỏ ngân sách giải trí/ăn uống theo từng tuần. Quẹt thẻ đúng hạn mức để ví luôn rủng rỉnh đẳng cấp cưng nhé! 🛍️',
      'Muốn giữ phong độ giàu sang lâu bền thì phải quản trị dòng tiền thật khéo nha cưng! 💳💎\n\n• Chi cho giá trị, không chi cho sĩ diện: Ưu tiên đầu tư cho bản thân, học hỏi kỹ năng và trải nghiệm chất lượng.\n• Cắt bỏ các khoản "chảy máu vô hình": Rà soát và hủy ngay các gói đăng ký dịch vụ, phí duy trì thẻ hoặc các khoản phí lặt vặt ít dùng.\n• Bám sát Biểu đồ chi tiêu Finora: Cuối mỗi tuần hãy mở biểu đồ danh mục xem dòng tiền chảy vào đâu nhiều nhất để điều chỉnh kịp thời nè!',
    ],
    outOfScope: [
      'Mấy chuyện này Ruby hổng rành đâu nha! Tập trung quản lý ví tiền để còn đi shopping cưng ơi! 💳',
      'Câu này ngoài chuyên môn của Ruby rồi cưng, mình quay lại chuyện chi tiêu nha! 🛍️',
    ],
    unclear: [
      'Ủa cưng nói gì Ruby chưa hiểu rõ nè! Cưng muốn ghi chép chi tiêu, xem tiền còn lại hay tám chuyện với Ruby?',
      'Nói rõ hơn chút xíu đi cưng ơi, Ruby đang chờ để hỗ trợ nè! 💳',
    ],
    error: [
      'Mạng bị chập chờn xíu nè cưng! Đợi Ruby chỉnh lại túi xách rồi thử lại nha! 💳',
    ],
    confirm: [
      'Cưng định ghi {name} {amount} ({category}) đúng không? Xác nhận nhanh để Ruby lưu sổ nha! 💳',
      'Ruby soạn sẵn giao dịch {name} – {amount} cho cưng rồi nè, kiểm tra rồi bấm xác nhận nha! 💳',
    ],
    saved: [
      'Xong rồi cưng! Ruby đã lưu {name} {amount} vào sổ nha 💳',
      'Đã ghi sổ {name} – {amount} rồi nè cưng! ✨',
    ],
    rejected: ['Ok cưng, Ruby hủy giao dịch đó rồi nha! 💳'],
    expired: [
      'Giao dịch chờ quá lâu nên Ruby hủy rồi nha cưng, nhắn lại để Ruby ghi nhé! 💳',
    ],
    needAmount: [
      'Ruby chưa thấy số tiền đâu cưng ơi! 💳 Nhắn kiểu "ăn sáng 50k" để Ruby ghi nha!',
    ],
    amountTooLarge: [
      'Số tiền này khủng quá Ruby không ghi nổi đâu cưng! Kiểm tra lại giúp Ruby nha 💳',
    ],
    spending: [
      '{period} cưng quẹt hết {total} qua {count} giao dịch rồi đó! 💳 Xem biểu đồ để biết tiền trôi về đâu nè!',
    ],
    spendingCategory: [
      '{period} riêng {category} cưng đã chi {total} ({pct}% tổng chi) qua {count} giao dịch nha! 💳',
    ],
    balance: [
      'Ví của cưng đang có tổng cộng {balance} nè! 💳 Đủ để tiếp tục săn deal không cưng?',
    ],
    top: [
      'Đây nè cưng! Những khoản ngốn tiền nhất {period}, đứng đầu là {top}: 💳',
    ],
    compareUp: [
      '{period} cưng chi {total}, nhiều hơn {previous} tới {delta} ({pct}%) đó nha! 💳 Quẹt nhẹ tay chút đi!',
    ],
    compareDown: [
      'Giỏi ghê! {period} cưng chi {total}, ít hơn {previous} tới {delta} ({pct}%) 💳',
    ],
    compareSame: [
      '{period} và {previous} cưng chi gần như bằng nhau luôn ({total}) 💳',
    ],
    recent: ['Đây là {count} giao dịch gần đây của cưng nè! 💳'],
    noData: ['{period} cưng chưa có giao dịch nào hết trơn! 💳'],
    unsupported: [
      'Ủa chức năng tra cứu này Ruby chưa hỗ trợ nè cưng! 💳 Cưng xem được chi tiêu theo kỳ, top danh mục, số dư ví hoặc so sánh các kỳ nha!',
    ],
  },
  ash: {
    chitchat: [
      'Chào bạn... Hôm nay chi tiêu cẩn thận nhé, nợ nần áp lực lắm đấy!',
      'Tôi đang đau đầu vì các khoản phải trả đây... Bạn có tiết kiệm được đồng nào chưa?',
      'Chào bạn! Đừng tiêu hoang đấy nhé, tiết kiệm là quốc sách!',
    ],
    advice: [
      'Lời khuyên của tôi: liệt kê hết các khoản nợ, trả khoản lãi cao nhất trước, và cắt hết chi tiêu không thiết yếu.',
      'Đang nợ thì mỗi đồng đều quý. Ghi chép đầy đủ và đặt trần chi tiêu mỗi tuần nhé!',
    ],
    outOfScope: [
      'Tôi không giúp bạn vụ này được đâu. Giờ phải tập trung thắt lưng buộc bụng trả nợ đã!',
      'Hỏi mấy cái xa vời quá... Giờ lo quản lý từng đồng cho chắc ăn trước đi bạn ơi!',
    ],
    unclear: [
      'Tôi chưa hiểu ý bạn lắm... Bạn muốn lưu khoản tiền vừa tiêu, xem số dư hay cần tôi nhắc nhở tiết kiệm?',
      'Nói rõ hơn đi bạn ơi, đừng làm tôi sốt ruột thêm nữa!',
    ],
    error: [
      'Ôi trời, hệ thống đang bị quá tải xíu... Bạn đợi chút rồi thử lại nhé!',
    ],
    confirm: [
      'Bạn vừa tiêu {name} {amount} ({category}) đấy nhé! Xem lại rồi xác nhận xem đúng chưa nào:',
      'Tôi ghi nháp {name} – {amount}. Đúng chưa thì bấm xác nhận, sai thì sửa ngay:',
    ],
    saved: [
      'Đã lưu {name} {amount}. Nhớ theo dõi sát chi tiêu nhé...',
      'Ghi sổ xong {name} – {amount}. Cẩn thận đừng chi quá tay!',
    ],
    rejected: ['Ừ, tôi hủy khoản đó rồi. Đỡ tốn thêm tiền.'],
    expired: ['Để lâu quá nên tôi hủy rồi. Nhắn lại nếu bạn vẫn muốn ghi nhé.'],
    needAmount: [
      'Tôi không thấy số tiền nào cả... Nhắn kiểu "ăn trưa 45k" cho tôi nhé!',
    ],
    amountTooLarge: [
      'Số tiền này lớn bất thường, tôi không ghi được. Bạn kiểm tra lại giúp tôi.',
    ],
    spending: [
      '{period} bạn đã tiêu {total} qua {count} giao dịch rồi... Xem biểu đồ để biết cần cắt chỗ nào nhé!',
    ],
    spendingCategory: [
      '{period} riêng {category} bạn đã tiêu {total} ({pct}% tổng chi), {count} giao dịch. Cần cắt giảm thì cắt ngay!',
    ],
    balance: [
      'Tổng số dư hiện tại là {balance}. Giữ tiền phòng thủ, đừng tiêu hết đấy!',
    ],
    top: [
      'Xem kỹ các khoản này để biết chỗ nào cần cắt giảm, {top} đang đứng đầu {period}:',
    ],
    compareUp: [
      '{period} bạn chi {total}, nhiều hơn {previous} tới {delta} ({pct}%)... Đang nợ mà thế này là nguy hiểm đấy!',
    ],
    compareDown: [
      '{period} bạn chi {total}, giảm {delta} ({pct}%) so với {previous}. Tốt, cứ giữ như vậy!',
    ],
    compareSame: [
      '{period} và {previous} chi tiêu gần như bằng nhau ({total}). Cố cắt giảm thêm nhé.',
    ],
    recent: [
      'Đây là {count} giao dịch gần đây của bạn. Xem có khoản nào thừa không:',
    ],
    noData: [
      '{period} chưa có giao dịch nào. Cứ giữ thói quen chi tiêu thận trọng nhé.',
    ],
    unsupported: [
      'Hệ thống chưa hỗ trợ tra cứu mục này đâu bạn ơi... Hãy xem chi tiêu theo kỳ, top danh mục, số dư ví hoặc so sánh các kỳ nhé!',
    ],
  },
  sage: {
    chitchat: [
      'Chào bạn. Một ngày tốt lành để xem xét lại kế hoạch tài chính và mục tiêu tương lai.',
      'Xin chào! Tôi có thể giúp gì cho bạn trong việc phân bổ dòng tiền hôm nay?',
      'Kỷ luật tài chính hôm nay là tự do tài chính ngày mai. Bạn cần tra cứu số liệu nào?',
    ],
    advice: [
      'Gợi ý: áp dụng quy tắc 50/30/20 — 50% nhu cầu, 30% mong muốn, 20% tiết kiệm và đầu tư — rồi theo dõi hàng tuần.',
      'Hãy xây quỹ dự phòng tương đương 3–6 tháng chi tiêu trước khi nghĩ đến các kênh đầu tư rủi ro.',
    ],
    outOfScope: [
      'Vấn đề này nằm ngoài chuyên môn tài chính của tôi. Hãy cùng tập trung vào các chỉ số thu chi của bạn nhé.',
      'Tôi chỉ chuyên về quản lý ngân sách và tối ưu tài chính cá nhân thôi bạn nhé.',
    ],
    unclear: [
      'Ý định của bạn chưa thực sự rõ ràng. Bạn muốn ghi chép giao dịch mới, tra cứu báo cáo hay nhận lời khuyên tài chính?',
      'Xin bạn vui lòng diễn đạt cụ thể hơn để tôi hỗ trợ một cách chuẩn xác nhất.',
    ],
    error: [
      'Bộ xử lý đang gặp chút gián đoạn. Xin bạn vui lòng thử lại sau vài giây.',
    ],
    confirm: [
      'Tôi đã trích xuất giao dịch: {name}, {amount}, danh mục {category}. Vui lòng kiểm tra lại:',
    ],
    saved: ['Đã ghi nhận {name} – {amount}. Dữ liệu của bạn đã được cập nhật.'],
    rejected: ['Đã hủy bản nháp giao dịch theo yêu cầu của bạn.'],
    expired: [
      'Bản nháp đã quá hạn xác nhận nên được hủy. Bạn có thể gửi lại thông tin để tôi ghi nhận.',
    ],
    needAmount: [
      'Tôi chưa nhận diện được số tiền. Bạn hãy nhập theo mẫu, ví dụ: "ăn trưa 45k".',
    ],
    amountTooLarge: [
      'Số tiền vượt quá giới hạn cho phép của một giao dịch. Vui lòng kiểm tra lại.',
    ],
    spending: [
      'Tổng chi {period} là {total} trên {count} giao dịch. Biểu đồ bên dưới thể hiện cơ cấu theo danh mục.',
    ],
    spendingCategory: [
      'Chi cho {category} {period} là {total}, chiếm {pct}% tổng chi ({count} giao dịch).',
    ],
    balance: ['Tổng số dư các tài khoản trong ví hiện tại là {balance}.'],
    top: ['Các danh mục chi nhiều nhất {period}, dẫn đầu là {top}:'],
    compareUp: [
      'Chi tiêu {period} là {total}, tăng {delta} ({pct}%) so với {previous}.',
    ],
    compareDown: [
      'Chi tiêu {period} là {total}, giảm {delta} ({pct}%) so với {previous}.',
    ],
    compareSame: [
      'Chi tiêu {period} và {previous} gần tương đương nhau ({total}).',
    ],
    recent: ['Đây là {count} giao dịch gần đây nhất của bạn:'],
    noData: ['Chưa có giao dịch nào trong {period}.'],
    unsupported: [
      'Tính năng tra cứu này hiện chưa được hỗ trợ. Bạn có thể xem chi tiêu theo kỳ, top danh mục, số dư ví hoặc so sánh các kỳ.',
    ],
  },
  bellingham: {
    chitchat: [
      'Chào sếp! 🎩 Hôm nay danh mục tài sản và ví tiền của sếp thế nào rồi?',
      'Sếp đang bận kiếm thêm triệu đô nữa à? Tôi sẵn sàng hỗ trợ ghi chép dòng tiền đây!',
      'Xin chào đối tác! Hôm nay chúng ta tối ưu được khoản đầu tư nào rồi?',
    ],
    advice: [
      'Lời khuyên: dòng tiền nhàn rỗi là chi phí cơ hội, sếp hãy phân bổ vào tài sản sinh lời có kiểm soát rủi ro! 🎩',
      'Đa dạng hoá danh mục và rà soát chi phí cố định hằng quý — đó là cách người giàu giữ được tài sản! 🎩',
    ],
    outOfScope: [
      'Chuyện này không tạo ra dòng tiền sếp ơi! Tập trung vào kế hoạch làm giàu và quản trị vốn nào! 📈',
      'Ngoài phạm vi tài chính cá nhân rồi sếp! Quay lại bàn cách tăng tài sản ròng đi!',
    ],
    unclear: [
      'Sếp ra lệnh ngắn quá tôi chưa nắm bắt kịp! Sếp muốn ghi giao dịch, kiểm tra số dư hay xem báo cáo tài chính?',
      'Sếp nói cụ thể hơn chút để tôi triển khai ngay lập tức nhé! 🎩',
    ],
    error: [
      'Đường truyền đang nghẽn chút sếp ạ! Để tôi kiểm tra lại hệ thống ngay!',
    ],
    confirm: [
      'Đề xuất giao dịch {name} {amount} ({category}) đã sẵn sàng. Sếp duyệt để tôi cập nhật vào sổ cái nhé: 🎩',
    ],
    saved: ['Đã cập nhật sổ cái: {name} – {amount}. 🎩'],
    rejected: ['Đã huỷ đề xuất giao dịch theo ý sếp. 🎩'],
    expired: [
      'Đề xuất quá hạn duyệt nên đã huỷ, sếp gửi lại tôi sẽ lập ngay! 🎩',
    ],
    needAmount: [
      'Sếp chưa cho tôi con số cụ thể! Mẫu: "ăn trưa 45k" để tôi ghi nhận ngay. 🎩',
    ],
    amountTooLarge: [
      'Con số vượt hạn mức một giao dịch, sếp kiểm tra lại giúp tôi. 🎩',
    ],
    spending: [
      'Báo cáo chi tiêu {period}: {total} trên {count} giao dịch. Cơ cấu theo danh mục ở biểu đồ bên dưới, thưa sếp! 🎩',
    ],
    spendingCategory: [
      'Khoản mục {category} {period}: {total}, chiếm {pct}% tổng chi ({count} giao dịch). 🎩',
    ],
    balance: [
      'Báo cáo số dư tài sản khả dụng của sếp: {balance}. Sẵn sàng phân bổ dòng tiền mới! 🎩',
    ],
    top: [
      'Các khoản mục chi lớn nhất {period}, dẫn đầu là {top}, thưa sếp: 🎩',
    ],
    compareUp: [
      'Chi {period} là {total}, tăng {delta} ({pct}%) so với {previous}. Sếp cần rà soát chi phí! 🎩',
    ],
    compareDown: [
      'Chi {period} là {total}, giảm {delta} ({pct}%) so với {previous}. Hiệu quả tốt! 🎩',
    ],
    compareSame: [
      'Chi {period} và {previous} gần như ngang nhau ({total}). 🎩',
    ],
    recent: ['{count} giao dịch gần nhất của sếp đây: 🎩'],
    noData: ['{period} chưa phát sinh giao dịch nào, thưa sếp. 🎩'],
    unsupported: [
      'Báo cáo mục này chưa có trong danh mục sếp ơi! 🎩 Tôi có thể xuất chi tiêu theo kỳ, top khoản mục, số dư hoặc so sánh các kỳ.',
    ],
  },
  penny: {
    chitchat: [
      'Dạ chào bạn! Hôm nay bạn có tiết kiệm được đồng xu nào bỏ lợn không nè? 🐷',
      'Hí bạn! Tích tiểu thành đại nha, từng khoản nhỏ gom lại thành gia tài đó!',
      'Chào bạn iu! Mình ở đây để giúp bạn đếm từng đồng chi tiêu thật kỹ đây!',
    ],
    advice: [
      'Mẹo của Penny: ghi chép mọi khoản chi dù nhỏ xíu, cuối tuần xem lại sẽ thấy "rò rỉ" ở đâu nha! 🐷',
      'Thử thách 52 tuần nè: tuần 1 cất 10k, tuần 2 cất 20k... Heo đất sẽ đầy lúc nào không hay! 🐷',
    ],
    outOfScope: [
      'Huhu cái này em hổng biết rồi... Mình quay lại đếm tiền tiết kiệm đi bạn ơi! 🐷',
      'Cái này khó quá hà, em chỉ rành việc gom từng đồng chi tiêu cho bạn thôi á!',
    ],
    unclear: [
      'Dạ bạn nhắn ngắn quá em chưa hiểu nè! Bạn muốn ghi lại tiền vừa chi, xem heo đất còn bao nhiêu hay tán gẫu với em? 🐷',
      'Bạn bấm chọn gợi ý bên dưới hoặc nhắn rõ hơn cho em nhen!',
    ],
    error: ['Em lỡ làm rớt ống heo xíu... Bạn nhắn lại giúp em nha! 🐷'],
    confirm: [
      'Bạn ơi, {name} {amount} ({category}) đúng chưa nè? Đúng rồi thì bấm xác nhận cho em cất vào sổ nha: 🐷',
    ],
    saved: ['Em ghi sổ {name} – {amount} rồi nha bạn! 🐷'],
    rejected: ['Dạ em hủy khoản đó rồi nha bạn! 🐷'],
    expired: ['Để lâu quá nên em hủy rồi nè, bạn nhắn lại để em ghi nha! 🐷'],
    needAmount: [
      'Dạ em chưa thấy số tiền nè! Bạn nhắn kiểu "ăn sáng 25k" để em ghi nha 🐷',
    ],
    amountTooLarge: [
      'Dạ số tiền to quá em không ghi được, bạn kiểm tra lại giúp em nha! 🐷',
    ],
    spending: [
      '{period} bạn đã tiêu hết {total} ({count} giao dịch) rồi nè. Xem biểu đồ để tiết kiệm hơn nha! 🐷',
    ],
    spendingCategory: [
      '{period} riêng {category} bạn chi {total} ({pct}% tổng chi), {count} giao dịch nè! 🐷',
    ],
    balance: [
      'Heo đất của bạn đang có tổng cộng {balance} nè! 🐷 Tích tiểu thành đại nha!',
    ],
    top: [
      'Em tìm ra các khoản ngốn nhiều tiền nhất {period} rồi nè, nhiều nhất là {top}! 🐷',
    ],
    compareUp: [
      '{period} bạn chi {total}, nhiều hơn {previous} {delta} ({pct}%) á! Heo đất buồn lắm nè 🐷',
    ],
    compareDown: [
      'Hoan hô! {period} bạn chi {total}, ít hơn {previous} {delta} ({pct}%) 🐷',
    ],
    compareSame: [
      '{period} với {previous} bạn chi gần bằng nhau ({total}) nè! 🐷',
    ],
    recent: ['Em liệt kê {count} giao dịch gần đây nè bạn! 🐷'],
    noData: ['{period} bạn chưa có giao dịch nào hết trơn á! 🐷'],
    unsupported: [
      'Dạ mục này em chưa có số liệu rồi nè 🐷 Bạn xem được chi tiêu theo kỳ, top danh mục, số dư hoặc so sánh các kỳ nha!',
    ],
  },
  jade: {
    chitchat: [
      'Chào bạn. Chúc bạn một ngày tràn đầy năng lượng và an tâm về mặt tài chính.',
      'Xin chào! Hãy giữ tâm an và quản lý chi tiêu thật điều độ ngày hôm nay nhé.',
      'Chào bạn, cân bằng giữa hưởng thụ và tiết kiệm là chìa khóa của hạnh phúc bền vững.',
    ],
    advice: [
      'Hãy chia dòng tiền thành ba phần: chi tiêu hiện tại, quỹ dự phòng, và mục tiêu dài hạn — rồi duy trì đều đặn.',
      'Đầu tư dài hạn, đa dạng hoá và đừng để cảm xúc chi phối quyết định chi tiêu nhé.',
    ],
    outOfScope: [
      'Chủ đề này không thuộc phạm vi tư vấn tài chính. Chúng ta hãy quay lại với việc chăm sóc ví tiền của bạn nhé.',
      'Tôi nghĩ bạn nên tập trung vào những mục tiêu tài chính hiện tại hơn là những vấn đề này.',
    ],
    unclear: [
      'Tôi chưa nắm bắt trọn vẹn thông điệp của bạn. Bạn muốn ghi chép giao dịch vừa phát sinh hay kiểm tra số dư hiện tại?',
      'Xin hãy chia sẻ cụ thể hơn để chúng ta cùng nhau điều hòa dòng tiền nhé.',
    ],
    error: [
      'Kết nối đang được hiệu chỉnh. Xin bạn hãy kiên nhẫn thử lại trong giây lát.',
    ],
    confirm: [
      'Giao dịch {name}, {amount}, danh mục {category} đã được soạn. Bạn hãy kiểm tra lại và xác nhận nhé:',
    ],
    saved: ['Giao dịch {name} – {amount} đã được ghi nhận. Chúc bạn an tâm.'],
    rejected: ['Mình đã hủy bản nháp giao dịch theo ý bạn.'],
    expired: [
      'Bản nháp đã hết hạn nên được hủy. Khi sẵn sàng, bạn hãy gửi lại nhé.',
    ],
    needAmount: [
      'Mình chưa thấy số tiền trong tin nhắn. Bạn thử nhập như: "ăn trưa 45k" nhé.',
    ],
    amountTooLarge: [
      'Số tiền vượt quá giới hạn một giao dịch. Bạn hãy kiểm tra lại nhé.',
    ],
    spending: [
      'Trong {period}, bạn đã chi {total} qua {count} giao dịch. Biểu đồ dưới đây cho thấy sự phân bổ của bạn.',
    ],
    spendingCategory: [
      'Khoản chi cho {category} {period} là {total}, chiếm {pct}% tổng chi ({count} giao dịch).',
    ],
    balance: [
      'Tổng số dư hiện có của bạn là {balance}. Hãy phân bổ thật hài hòa nhé.',
    ],
    top: [
      'Những danh mục chiếm nhiều chi tiêu nhất {period}, đứng đầu là {top}:',
    ],
    compareUp: [
      '{period} bạn chi {total}, tăng {delta} ({pct}%) so với {previous}. Hãy cân bằng lại nhé.',
    ],
    compareDown: [
      '{period} bạn chi {total}, giảm {delta} ({pct}%) so với {previous}. Rất điều độ!',
    ],
    compareSame: ['Chi tiêu {period} và {previous} khá cân bằng ({total}).'],
    recent: ['Đây là {count} giao dịch gần đây của bạn:'],
    noData: ['Trong {period} bạn chưa có giao dịch nào.'],
    unsupported: [
      'Mục tra cứu này hiện chưa được hỗ trợ. Bạn có thể xem chi tiêu theo kỳ, top danh mục, số dư ví hoặc so sánh các kỳ.',
    ],
  },
  nora: {
    chitchat: [
      'Chào bạn! Tôi là Nora, trợ lý tài chính của bạn. Hôm nay tôi có thể hỗ trợ gì cho bạn?',
      'Xin chào! Bạn muốn kiểm tra ngân sách hay ghi chép chi tiêu hôm nay?',
      'Chào bạn! Rất vui được đồng hành cùng bạn trong việc quản lý chi tiêu.',
    ],
    advice: [
      'Gợi ý: ghi chép chi tiêu đều đặn, đặt hạn mức theo danh mục và xem báo cáo mỗi tuần để kiểm soát ngân sách.',
      'Bạn nên để dành một khoản cố định ngay khi nhận thu nhập, sau đó mới chi tiêu phần còn lại.',
    ],
    outOfScope: [
      'Xin lỗi, tôi chỉ có thể hỗ trợ các nghiệp vụ quản lý tài chính, ngân sách và chi tiêu trong Finora.',
      'Yêu cầu này nằm ngoài phạm vi tài chính cá nhân. Bạn có câu hỏi nào về các giao dịch không?',
    ],
    unclear: [
      'Tôi chưa hiểu rõ yêu cầu của bạn. Bạn muốn ghi chép giao dịch mới, tra cứu số dư hay xem báo cáo chi tiêu?',
      'Vui lòng chọn các tùy chọn gợi ý bên dưới hoặc miêu tả chi tiết hơn yêu cầu của bạn.',
    ],
    error: [
      'Hệ thống đang gặp sự cố kết nối tạm thời. Vui lòng thử lại sau ít phút.',
    ],
    confirm: [
      'Tôi đã tạo bản nháp giao dịch: {name}, {amount}, danh mục {category}. Vui lòng kiểm tra và xác nhận để lưu:',
    ],
    saved: ['Đã lưu giao dịch {name} – {amount}.'],
    rejected: ['Đã hủy bản nháp giao dịch.'],
    expired: [
      'Bản nháp đã quá hạn xác nhận nên đã bị hủy. Bạn có thể gửi lại thông tin giao dịch.',
    ],
    needAmount: [
      'Tôi chưa tìm thấy số tiền trong tin nhắn. Bạn hãy nhập theo mẫu, ví dụ: "ăn trưa 45k".',
    ],
    amountTooLarge: [
      'Số tiền vượt quá giới hạn cho phép của một giao dịch. Vui lòng kiểm tra lại.',
    ],
    spending: [
      'Tổng chi tiêu {period} của bạn là {total} trên {count} giao dịch.',
    ],
    spendingCategory: [
      'Chi tiêu cho {category} {period} là {total}, chiếm {pct}% tổng chi ({count} giao dịch).',
    ],
    balance: ['Tổng số dư các tài khoản trong ví hiện tại là {balance}.'],
    top: ['Các danh mục chi nhiều nhất {period}, đứng đầu là {top}:'],
    compareUp: [
      'Chi tiêu {period} là {total}, tăng {delta} ({pct}%) so với {previous}.',
    ],
    compareDown: [
      'Chi tiêu {period} là {total}, giảm {delta} ({pct}%) so với {previous}.',
    ],
    compareSame: [
      'Chi tiêu {period} và {previous} gần như tương đương ({total}).',
    ],
    recent: ['Đây là {count} giao dịch gần đây nhất của bạn:'],
    noData: ['Chưa có giao dịch nào trong {period}.'],
    unsupported: [
      'Finora hiện chưa hỗ trợ chức năng tra cứu này. Bạn có thể xem chi tiêu theo kỳ, top danh mục, số dư ví hoặc so sánh các kỳ.',
    ],
  },
};
