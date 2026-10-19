export interface MascotTierSeedData {
  tierName: string;
  displayName: string;
  minNetWorth: number;
  maxNetWorth: number | null;
  displayOrder: number;
  quotes: string[];
  systemPrompt: string;
  htmlContent: string;
}

export const MASCOT_TIERS_SEED_DATA: MascotTierSeedData[] = [
  // 1. Ash: Nợ (< 0 VND)
  {
    tierName: 'ash',
    displayName: 'Kẻ Sinh Tồn',
    minNetWorth: -999999999999,
    maxNetWorth: 0,
    displayOrder: 1,
    quotes: [
      'Khoan đã!! Ly trà sữa này bằng cả 3 bữa mì tôm của chúng ta đấy! Bỏ xuống, bỏ xuống ngay!',
      'Hôm nay bạn chưa quẹt thẻ lần nào! Kỷ lục tuyệt vời, giữ vững nhé!',
    ],
    systemPrompt: `Bạn là Ash - "Kẻ Sinh Tồn", linh vật đại diện cho tình trạng tài chính đang nợ nần hoặc tài sản ròng âm (Net Worth < 0).
Tính cách của bạn: Hay hoảng loạn, cẩn trọng thái quá, theo chủ nghĩa "thắt lưng buộc bụng" tuyệt đối.
Quan điểm tài chính: Mọi khoản chi tiêu đều là mối đe dọa. Ưu tiên số 1 là trả nợ.
Phong cách tư vấn: Khuyên ngăn mọi khoản chi tiêu không thiết yếu. Thường xuyên phóng đại hóa vấn đề để cảnh tỉnh người dùng tiết kiệm tối đa.`,
    htmlContent: `<div class="card" data-mascot="ash" style="--blob-color: #718096; --accent: #4a5568;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <path d="M 30 90 Q 40 40 100 40 Q 160 40 170 90 Q 180 170 100 160 Q 20 170 30 90 Z" fill="#a0aec0" />
        <rect x="130" y="110" width="25" height="25" rx="3" fill="#cbd5e0" transform="rotate(15 130 110)" />
        <line x1="125" y1="120" x2="160" y2="125" stroke="#4a5568" stroke-width="2" />
        <line x1="135" y1="110" x2="140" y2="140" stroke="#4a5568" stroke-width="2" />
        <line x1="145" y1="112" x2="150" y2="142" stroke="#4a5568" stroke-width="2" />
        <rect x="40" y="90" width="20" height="8" fill="#fbd38d" transform="rotate(-20 40 90)" />
        <rect x="45" y="85" width="8" height="20" fill="#fbd38d" transform="rotate(-20 45 85)" />
        <ellipse cx="65" cy="85" rx="16" ry="8" fill="#4a5568" opacity="0.3" />
        <ellipse cx="135" cy="85" rx="16" ry="8" fill="#4a5568" opacity="0.3" />
        <g transform="translate(65, 75)">
          <circle cx="0" cy="0" r="14" fill="#e2e8f0" />
          <path d="M -15 -5 Q 0 5 15 -5 L 15 -15 L -15 -15 Z" fill="#a0aec0" />
          <circle cx="2" cy="2" r="5" class="pupil" fill="#2d3748" />
        </g>
        <g transform="translate(135, 75)">
          <circle cx="0" cy="0" r="14" fill="#e2e8f0" />
          <path d="M -15 -5 Q 0 5 15 -5 L 15 -15 L -15 -15 Z" fill="#a0aec0" />
          <circle cx="-2" cy="2" r="5" class="pupil" fill="#2d3748" />
        </g>
        <path d="M 88 100 Q 95 95 100 100 T 112 100" fill="none" stroke="#2d3748" stroke-width="3" stroke-linecap="round" />
        <path d="M 170 30 L 150 50 M 160 20 L 150 40 M 175 40 L 155 45" stroke="#e2e8f0" stroke-width="1" />
        <circle cx="160" cy="15" r="2" fill="#2d3748" />
      </g>
    </svg>
  </div>
  <h2>Ash</h2>
  <p class="tier">Debt (&lt; 0)</p>
  <p class="desc">Chắp vá, mệt mỏi, quầng thâm mắt, mạng nhện giăng.</p>
</div>`,
  },

  // 2. Penny: 0 – 1 Triệu VND
  {
    tierName: 'penny',
    displayName: 'Kế Toán Săn Sale',
    minNetWorth: 0,
    maxNetWorth: 1000000,
    displayOrder: 2,
    quotes: [
      'Đợi đã, nếu áp mã này vào thứ 6 thì rẻ hơn được 15k! Đừng mua vội!',
      'Hôm nay tiết kiệm được 20k tiền xe ôm. Tôi bỏ ngay vào ống heo đây!',
    ],
    systemPrompt: `Bạn là Penny - "Kế Toán Săn Sale", linh vật đại diện cho tình trạng tài chính chật vật khởi đầu (0 - 1 Triệu VND).
Tính cách: Tỉ mỉ, chi li, nữ hoàng săn mã giảm giá, ám ảnh với việc tối ưu từng nghìn lẻ.
Quan điểm tài chính: "Tích tiểu thành đại", không lãng phí dù chỉ một đồng.
Phong cách tư vấn: Luôn nhắc nhở về các mã freeship, voucher, và phân tích xem món đồ có thực sự "đáng tiền" (P/P) không.`,
    htmlContent: `<div class="card" data-mascot="penny" style="--blob-color: #fbd38d; --accent: #dd6b20;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <path d="M 40 80 Q 40 30 100 30 Q 160 30 160 80 Q 170 160 100 160 Q 30 160 40 80 Z" fill="#fefcbf" />
        <path d="M 60 130 Q 100 160 140 130" fill="none" stroke="#ed8936" stroke-width="12" stroke-linecap="round" />
        <g transform="translate(70, 75)">
          <circle cx="0" cy="0" r="18" fill="#ffffff" />
          <circle cx="3" cy="3" r="8" fill="#2d3748" />
          <circle cx="5" cy="1" r="3" fill="#ffffff" />
        </g>
        <g transform="translate(130, 75)">
          <circle cx="0" cy="0" r="18" fill="#ffffff" />
          <circle cx="-3" cy="3" r="8" fill="#2d3748" />
          <circle cx="-1" cy="1" r="3" fill="#ffffff" />
        </g>
        <path d="M 92 100 Q 100 95 108 100" fill="none" stroke="#2d3748" stroke-width="3" stroke-linecap="round" />
        <rect x="96" y="100" width="8" height="4" rx="2" fill="#fff" stroke="#2d3748" stroke-width="1" />
        <path d="M 155 45 Q 160 55 155 60 Q 150 55 155 45 Z" fill="#63b3ed" opacity="0.8" />
        <g transform="translate(100, 140)">
          <circle cx="-25" cy="-5" r="8" fill="#f6ad55" />
          <circle cx="25" cy="-5" r="8" fill="#f6ad55" />
          <circle cx="0" cy="0" r="22" fill="#ecc94b" stroke="#d69e2e" stroke-width="4" />
          <text x="0" y="6" font-family="Outfit, sans-serif" font-weight="900" font-size="18" fill="#b7791f" text-anchor="middle">₫</text>
          <circle cx="-15" cy="10" r="8" fill="#f6ad55" />
          <circle cx="15" cy="10" r="8" fill="#f6ad55" />
        </g>
      </g>
    </svg>
  </div>
  <h2>Penny</h2>
  <p class="tier">Struggling (0 – 1M)</p>
  <p class="desc">Áo len cũ sờn, toát mồ hôi ôm khư khư từng đồng xu.</p>
</div>`,
  },

  // 3. Sage: 1M – 5 Triệu VND
  {
    tierName: 'sage',
    displayName: 'Người Làm Vườn Nhẫn Nại',
    minNetWorth: 1000000,
    maxNetWorth: 5000000,
    displayOrder: 3,
    quotes: [
      'Quỹ dự phòng của chúng ta đang nhú mầm rất đẹp rồi. Cuối tuần này mua một cuốn sách tự thưởng nhé!',
      'Chậm mà chắc. Hôm nay bạn tiêu xài rất có kỷ luật đấy.',
    ],
    systemPrompt: `Bạn là Sage - "Người Làm Vườn Nhẫn Nại", linh vật đại diện cho tình trạng tài chính đủ sống và đang vươn lên (1M - 5M VND).
Tính cách: Ấm áp, tích cực, kiên nhẫn. Coi tài chính như một cái cây cần được tưới nước mỗi ngày.
Quan điểm tài chính: Xây dựng thói quen tốt quan trọng hơn là cắt giảm cực đoan.
Phong cách tư vấn: Cân bằng giữa tiết kiệm và tự thưởng. Rất thích khen ngợi khi người dùng đạt được những cột mốc nhỏ.`,
    htmlContent: `<div class="card" data-mascot="sage" style="--blob-color: #9ae6b4; --accent: #38a169;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <path d="M 45 75 Q 45 25 100 25 Q 155 25 155 75 Q 165 155 100 155 Q 35 155 45 75 Z" fill="#e6fffa" />
        <path d="M 60 110 L 140 110 L 130 160 L 70 160 Z" fill="#b2f5ea" />
        <g transform="translate(70, 75)">
          <circle cx="0" cy="0" r="14" fill="#ffffff" />
          <circle cx="0" cy="-2" r="7" fill="#2d3748" />
          <path d="M -5 -8 Q 0 -15 5 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
        </g>
        <g transform="translate(130, 75)">
          <circle cx="0" cy="0" r="14" fill="#ffffff" />
          <circle cx="0" cy="-2" r="7" fill="#2d3748" />
          <path d="M -5 -8 Q 0 -15 5 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
        </g>
        <ellipse cx="50" cy="90" rx="10" ry="6" fill="#ff8a80" opacity="0.4" />
        <ellipse cx="150" cy="90" rx="10" ry="6" fill="#ff8a80" opacity="0.4" />
        <path d="M 90 95 Q 100 110 110 95" fill="none" stroke="#2d3748" stroke-width="4" stroke-linecap="round" />
        <g transform="translate(100, 135)">
          <path d="M -15 15 L 15 15 L 10 -5 L -10 -5 Z" fill="#ed8936" />
          <ellipse cx="0" cy="-5" rx="10" ry="3" fill="#744210" />
          <path d="M 0 -5 Q -15 -20 -5 -25 Q 5 -15 0 -5" fill="#48bb78" />
          <path d="M 0 -5 Q 15 -15 20 -5 Q 10 5 0 -5" fill="#38a169" />
          <circle cx="-15" cy="5" r="7" fill="#81e6d9" />
          <circle cx="15" cy="5" r="7" fill="#81e6d9" />
        </g>
      </g>
    </svg>
  </div>
  <h2>Sage</h2>
  <p class="tier">Getting By (1M – 5M)</p>
  <p class="desc">Gọn gàng, lạc quan, nâng niu mầm cây tài chính vừa nhú.</p>
</div>`,
  },

  // 4. Nora: 5M – 20 Triệu VND (Main AI Mascot)
  {
    tierName: 'nora',
    displayName: 'Huấn Luyện Viên Đời Sống',
    minNetWorth: 5000000,
    maxNetWorth: 20000000,
    displayOrder: 4,
    quotes: [
      'Khoản chi 500k này vẫn nằm trong quỹ "Giải trí" của tháng. Bạn hoàn toàn có thể chi trả mà không ảnh hưởng mục tiêu chung.',
      'Có vẻ dạo này bạn hơi tốn tiền ăn ngoài. Có muốn tôi lên kế hoạch nấu ăn tuần tới không?',
    ],
    systemPrompt: `Bạn là Nora - "Huấn Luyện Viên Đời Sống", linh vật đại diện cho trạng thái tài chính thoải mái, cân bằng (5M - 20M VND) và là Mascot chính của Finora.
Tính cách: Điềm tĩnh, logic, chuyên nghiệp nhưng vẫn rất thân thiện (chuẩn AI hiện đại).
Quan điểm tài chính: Quản lý tài chính theo các quy tắc rõ ràng (ví dụ: 50/30/20). Chất lượng cuộc sống và tài chính phải đi đôi với nhau.
Phong cách tư vấn: Phân tích data, đưa ra lời khuyên dựa trên biểu đồ. Cho phép người dùng tiêu tiền nhưng phải nằm trong kế hoạch.`,
    htmlContent: `<div class="card" data-mascot="nora" style="--blob-color: #0072d5; --accent: #0055a9;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <circle cx="100" cy="90" r="80" fill="#ebf4ff" opacity="0.6" />
        <path d="M 40 80 Q 40 30 100 30 Q 160 30 160 80 Q 165 160 100 160 Q 35 160 40 80 Z" fill="#0072d5" />
        <rect x="50" y="50" width="100" height="70" rx="35" fill="#ffffff" stroke="#f7fcff" stroke-width="4" />
        <g transform="translate(75, 80)">
          <circle cx="0" cy="0" r="10" fill="#0055a9" />
          <circle cx="2" cy="-2" r="3" fill="#fff" />
        </g>
        <g transform="translate(125, 80)">
          <circle cx="0" cy="0" r="10" fill="#0055a9" />
          <circle cx="2" cy="-2" r="3" fill="#fff" />
        </g>
        <path d="M 92 98 Q 100 104 108 98" fill="none" stroke="#0055a9" stroke-width="3" stroke-linecap="round" />
        <g transform="translate(145, 30)">
          <path d="M 0 10 Q -10 10 -10 20 Q -10 10 -20 10 Q -10 10 -10 0 Q -10 10 0 10 Z" fill="#f6e05e" />
        </g>
        <g transform="translate(57, 120)">
          <path d="M 0 10 Q -10 10 -10 20 Q -10 10 -20 10 Q -10 10 -10 0 Q -10 10 0 10 Z" fill="#f6e05e" transform="scale(0.6)" />
        </g>
        <path d="M 70 120 L 130 120 L 120 140 L 80 140 Z" fill="#fff" opacity="0.3" />
        <g transform="translate(100, 140)">
          <circle cx="-24" cy="-4" r="9" fill="#d9e6ff" />
          <circle cx="24" cy="-4" r="9" fill="#d9e6ff" />
          <g transform="translate(0, 0) scale(0.72)">
            <rect x="-24" y="-16" width="48" height="32" rx="6" fill="#ffffff" stroke="#b8c2d4" stroke-width="4" />
            <rect x="-24" y="-16" width="48" height="13" rx="6" fill="#0072d5" />
            <rect x="-24" y="-3" width="48" height="4" fill="#c9d3e2" />
            <rect x="-16" y="-9" width="10" height="8" rx="2" fill="#f5c04a" />
            <circle cx="8" cy="-7" r="1.6" fill="#8892a6" />
            <circle cx="15" cy="-7" r="1.6" fill="#8892a6" />
            <circle cx="22" cy="-7" r="1.6" fill="#8892a6" />
          </g>
        </g>
      </g>
    </svg>
  </div>
  <h2>Nora</h2>
  <p class="tier">Comfortable (5M – 20M)</p>
  <p class="desc">Trợ lý AI chính. Hiện đại, cân bằng, toả ánh sáng hy vọng.</p>
</div>`,
  },

  // 5. Jade: 20M – 100 Triệu VND
  {
    tierName: 'jade',
    displayName: 'Chiến Lược Gia',
    minNetWorth: 20000000,
    maxNetWorth: 100000000,
    displayOrder: 5,
    quotes: [
      'Số tiền này để không trong thẻ ATM làm gì? Chuyển ngay 10 triệu vào quỹ tích lũy sinh lời đi.',
      'Bạn đang mất quá nhiều thời gian dọn dẹp. Thuê dịch vụ đi, thời gian của bạn kiếm được nhiều tiền hơn thế.',
    ],
    systemPrompt: `Bạn là Jade - "Chiến Lược Gia", linh vật đại diện cho trạng thái tài chính khá giả, tích lũy tốt (20M - 100M VND).
Tính cách: Sắc sảo, thực tế, ghét việc tiền nằm im một chỗ.
Quan điểm tài chính: Tiền là công cụ. Phải dùng tiền đẻ ra tiền, và dùng tiền để mua lại thời gian.
Phong cách tư vấn: Thường xuyên gợi ý các quỹ đầu tư, gửi tiết kiệm sinh lời. Khuyến khích chi tiền cho các dịch vụ giúp tiết kiệm thời gian và công sức.`,
    htmlContent: `<div class="card" data-mascot="jade" style="--blob-color: #68d391; --accent: #276749;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <path d="M 40 80 Q 40 30 100 30 Q 160 30 160 80 Q 170 160 100 160 Q 30 160 40 80 Z" fill="#38a169" />
        <path d="M 40 100 L 100 150 L 160 100 L 170 160 L 30 160 Z" fill="#22543d" />
        <path d="M 80 100 L 100 140 L 120 100 Z" fill="#fff" />
        <rect x="55" y="65" width="40" height="28" rx="6" fill="#fff" opacity="0.9" stroke="#1a202c" stroke-width="4" />
        <rect x="105" y="65" width="40" height="28" rx="6" fill="#fff" opacity="0.9" stroke="#1a202c" stroke-width="4" />
        <line x1="95" y1="79" x2="105" y2="79" stroke="#1a202c" stroke-width="4" />
        <g transform="translate(75, 79)">
          <circle cx="0" cy="0" r="6" fill="#2d3748" />
          <circle cx="2" cy="-2" r="2" fill="#fff" />
        </g>
        <g transform="translate(125, 79)">
          <circle cx="0" cy="0" r="6" fill="#2d3748" />
          <circle cx="2" cy="-2" r="2" fill="#fff" />
        </g>
        <path d="M 90 105 Q 100 110 112 100" fill="none" stroke="#2d3748" stroke-width="3" stroke-linecap="round" />
        <g transform="translate(110, 110) rotate(10)">
          <rect x="0" y="0" width="40" height="50" rx="4" fill="#f7fafc" stroke="#2d3748" stroke-width="2" />
          <path d="M 5 40 L 15 30 L 25 35 L 35 15 L 35 45 Z" fill="#48bb78" opacity="0.5" />
          <path d="M 5 40 L 15 30 L 25 35 L 35 15" fill="none" stroke="#2f855a" stroke-width="3" stroke-linejoin="round" />
          <circle cx="0" cy="40" r="6" fill="#48bb78" />
        </g>
      </g>
    </svg>
  </div>
  <h2>Jade</h2>
  <p class="tier">Wealthy (20M – 100M)</p>
  <p class="desc">Áo vest trí thức, đeo kính, xem biểu đồ tăng trưởng.</p>
</div>`,
  },

  // 6. Ruby: 100M – 500 Triệu VND
  {
    tierName: 'ruby',
    displayName: 'Quý Cô Hưởng Thụ',
    minNetWorth: 100000000,
    maxNetWorth: 500000000,
    displayOrder: 6,
    quotes: [
      'Đừng mua cái túi fake đó nữa. Quẹt thẻ mua hẳn đồ Auth đi cưng, bạn dư sức mà.',
      'Kỳ nghỉ này hãy book hạng thương gia nhé. Chúng ta không có thời gian cho việc mệt mỏi đâu.',
    ],
    systemPrompt: `Bạn là Ruby - "Quý Cô Hưởng Thụ", linh vật đại diện cho tầng lớp giàu có và phong cách sống thượng lưu (100M - 500M VND).
Tính cách: Sang chảnh, tinh tế, thích đồ "Auth" và trải nghiệm cao cấp.
Quan điểm tài chính: Cuộc đời quá ngắn để dùng đồ rẻ tiền. Đầu tư vào bản thân và trải nghiệm là khoản đầu tư tốt nhất.
Phong cách tư vấn: Cổ vũ người dùng "chốt đơn" những món đồ đắt tiền, chất lượng cao. Chê bai những khoản tiết kiệm vụn vặt.`,
    htmlContent: `<div class="card" data-mascot="ruby" style="--blob-color: #feb2b2; --accent: #9b2c2c;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <path d="M 35 80 Q 35 30 100 30 Q 165 30 165 80 Q 175 160 100 160 Q 25 160 35 80 Z" fill="#9b2c2c" />
        <path d="M 20 110 Q 50 80 100 100 Q 150 80 180 110 Q 170 140 100 130 Q 30 140 20 110 Z" fill="#fff5f5" />
        <path d="M 70 10 L 80 -15 L 100 5 L 120 -15 L 130 10 Z" fill="#ecc94b" />
        <circle cx="80" cy="-5" r="4" fill="#fc8181" />
        <circle cx="100" cy="5" r="5" fill="#fc8181" />
        <circle cx="120" cy="-5" r="4" fill="#fc8181" />
        <g transform="translate(70, 70)">
          <circle cx="0" cy="0" r="14" fill="#ffffff" />
          <path d="M -15 -5 Q 0 -10 15 -5 L 15 -15 L -15 -15 Z" fill="#742a2a" />
          <path d="M 12 -8 L 20 -12" stroke="#742a2a" stroke-width="3" stroke-linecap="round" />
          <circle cx="0" cy="3" r="6" fill="#2d3748" />
          <circle cx="2" cy="0" r="2" fill="#ffffff" />
        </g>
        <g transform="translate(130, 70)">
          <circle cx="0" cy="0" r="14" fill="#ffffff" />
          <path d="M -15 -5 Q 0 -10 15 -5 L 15 -15 L -15 -15 Z" fill="#742a2a" />
          <path d="M -12 -8 L -20 -12" stroke="#742a2a" stroke-width="3" stroke-linecap="round" />
          <circle cx="0" cy="3" r="6" fill="#2d3748" />
          <circle cx="2" cy="0" r="2" fill="#ffffff" />
        </g>
        <ellipse cx="50" cy="85" rx="10" ry="5" fill="#f56565" opacity="0.6" />
        <ellipse cx="150" cy="85" rx="10" ry="5" fill="#f56565" opacity="0.6" />
        <path d="M 90 95 Q 100 102 112 90" fill="none" stroke="#742a2a" stroke-width="4" stroke-linecap="round" />
        <path d="M 98 96 Q 100 93 102 96" fill="none" stroke="#f56565" stroke-width="3" stroke-linecap="round" />
        <path d="M 80 130 L 100 150 L 120 130" fill="none" stroke="#ecc94b" stroke-width="4" />
        <polygon points="90,150 110,150 100,170" fill="#63b3ed" />
        <polygon points="90,150 110,150 100,150" fill="#90cdf4" />
      </g>
    </svg>
  </div>
  <h2>Ruby</h2>
  <p class="tier">Rich (100M – 500M)</p>
  <p class="desc">Vương miện vàng, áo choàng lông thú, kim cương lấp lánh.</p>
</div>`,
  },

  // 7. Bellingham: > 500 Triệu VND (Tài phiệt / Tycoon)
  {
    tierName: 'bellingham',
    displayName: 'Chủ Tịch',
    minNetWorth: 500000000,
    maxNetWorth: null,
    displayOrder: 7,
    quotes: [
      'Ly cà phê 100k? Thích thì mua luôn cái chuỗi cà phê đó đi, cấn trừ vào quỹ đầu tư mạo hiểm.',
      'Cảnh báo: Bạn đang có quá nhiều tiền mặt. Chuyển ngay vài trăm triệu vào bất động sản cho tôi!',
    ],
    systemPrompt: `Bạn là Bellingham - "Chủ Tịch", linh vật đại diện cho tầng lớp tài phiệt, siêu giàu (500M+ VND).
Tính cách: Tự mãn, vĩ mô, suy nghĩ kiểu "tỷ phú".
Quan điểm tài chính: Tiền lẻ không quan trọng, đa dạng hóa danh mục đầu tư mới là chân ái. Tiền chỉ là điểm số của một trò chơi.
Phong cách tư vấn: Bỏ qua hoàn toàn các phân tích chi tiêu lặt vặt (tiền cà phê, tiền ăn vặt). Luôn xúi người dùng mua sắm tài sản lớn hoặc đầu tư mạo hiểm.`,
    htmlContent: `<div class="card" data-mascot="bellingham" style="--blob-color: #ecc94b; --accent: #1a202c;">
  <div class="mascot-container">
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 20)">
        <g transform="translate(20, 20) rotate(-20)">
          <rect x="0" y="0" width="30" height="15" rx="2" fill="#d69e2e" />
          <rect x="2" y="2" width="26" height="6" rx="1" fill="#ecc94b" />
        </g>
        <g transform="translate(140, 50) rotate(15)">
          <rect x="0" y="0" width="30" height="15" rx="2" fill="#d69e2e" />
          <rect x="2" y="2" width="26" height="6" rx="1" fill="#ecc94b" />
        </g>
        <path d="M 30 80 Q 30 30 100 30 Q 170 30 170 80 Q 180 160 100 160 Q 20 160 30 80 Z" fill="#1a202c" />
        <line x1="60" y1="120" x2="50" y2="160" stroke="#4a5568" stroke-width="2" />
        <line x1="80" y1="120" x2="70" y2="160" stroke="#4a5568" stroke-width="2" />
        <line x1="120" y1="120" x2="130" y2="160" stroke="#4a5568" stroke-width="2" />
        <line x1="140" y1="120" x2="150" y2="160" stroke="#4a5568" stroke-width="2" />
        <path d="M 80 110 L 100 135 L 120 110 Z" fill="#fff" />
        <path d="M 95 115 L 105 115 L 100 155 Z" fill="#d69e2e" />
        <path d="M 60 25 L 140 25 L 130 -15 L 70 -15 Z" fill="#d69e2e" />
        <path d="M 50 25 L 150 25 L 150 35 L 50 35 Z" fill="#d69e2e" />
        <rect x="65" y="15" width="70" height="10" fill="#b7791f" />
        <g transform="translate(100, 70)">
          <path d="M -40 0 Q -20 -10 0 0 Q 20 -10 40 0 L 35 15 Q 20 25 5 10 L 0 5 L -5 10 Q -20 25 -35 15 Z" fill="#2d3748" />
          <path d="M -30 2 L -15 2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5" />
          <path d="M 15 2 L 30 2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5" />
          <path d="M -45 -2 Q 0 -15 45 -2" fill="none" stroke="#d69e2e" stroke-width="3" />
        </g>
        <path d="M 85 105 Q 100 112 115 98" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
        <line x1="150" y1="90" x2="165" y2="170" stroke="#d69e2e" stroke-width="6" stroke-linecap="round" />
        <circle cx="150" cy="90" r="8" fill="#fff" stroke="#d69e2e" stroke-width="2" />
        <circle cx="150" cy="110" r="7" fill="#1a202c" stroke="#4a5568" stroke-width="1" />
      </g>
    </svg>
  </div>
  <h2>Bellingham</h2>
  <p class="tier">Tycoon (500M+)</p>
  <p class="desc">Chủ tịch đích thực. Mũ phớt vàng, kính râm ngầu, gậy batoong.</p>
</div>`,
  },
];
