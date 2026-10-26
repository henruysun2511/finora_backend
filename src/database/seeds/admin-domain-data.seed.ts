import { AppDataSource } from '../data-source';

async function seedAdminDomainData() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU MIGRATE & SEED DỮ LIỆU TOÀN DIỆN CHO ADMIN 🚀');
  console.log('========================================================');

  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: XÁC MINH & ĐỒNG BỘ TÀI KHOẢN ADMIN VÀ BẠN BÈ HỆ THỐNG
    // -------------------------------------------------------------------------
    console.log('\n[1/10] Xác minh tài khoản Admin và khởi tạo người dùng bổ trợ...');
    
    // Tìm Admin id
    const adminRows = await queryRunner.query(
      `SELECT id, email, full_name FROM "users" WHERE email = 'admin@finora.com' LIMIT 1`,
    );

    let adminId: string;
    if (adminRows.length > 0) {
      adminId = adminRows[0].id;
      console.log(` ✅ Đã tìm thấy Admin: ${adminRows[0].full_name} (ID: ${adminId})`);
    } else {
      adminId = '411ae0e4-8bf7-47b4-ae29-e0e7393e3b44';
      await queryRunner.query(
        `INSERT INTO "users" (id, username, email, password, full_name, auth_provider, status, is_active)
         VALUES ($1, 'admin', 'admin@finora.com', '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO', 'Quản trị viên Finora', 'LOCAL', 'ACTIVE', true)
         ON CONFLICT (email) DO UPDATE SET is_active = true`,
        [adminId],
      );
      console.log(` ✅ Đã tạo mới Admin ID: ${adminId}`);
    }

    // Đảm bảo User Settings cho Admin
    await queryRunner.query(
      `INSERT INTO "user_settings" (id, user_id, default_currency, language, theme, app_lock_enabled, require_pin_for_transactions, show_mascot, mascot_tone, mascot_sensitivity)
       VALUES (uuid_generate_v4(), $1, 'VND', 'vi', 'DARK', false, false, true, 'BALANCED', 'ANOMALIES_ONLY')
       ON CONFLICT (user_id) DO UPDATE SET 
         theme = 'DARK',
         show_mascot = true,
         mascot_tone = 'BALANCED'`,
      [adminId],
    );

    // Người dùng bổ trợ (Bạn bè, người tham gia chia tiền, người vay)
    const friendUsers = [
      {
        id: 'b1111111-1111-4111-a111-111111111111',
        username: 'minhhoang',
        email: 'minh.hoang@finora.internal',
        fullName: 'Hoàng Văn Minh',
      },
      {
        id: 'b2222222-2222-4222-a222-222222222222',
        username: 'lananh',
        email: 'lan.anh@finora.internal',
        fullName: 'Nguyễn Thị Lan Anh',
      },
      {
        id: 'b3333333-3333-4333-a333-333333333333',
        username: 'quocbao',
        email: 'quoc.bao@finora.internal',
        fullName: 'Lê Quốc Bảo',
      },
    ];

    // Xóa liên kết bạn bè và người dùng cũ trước khi nạp ID mới
    await queryRunner.query(
      `DELETE FROM "friendships" WHERE requester_id = $1 OR addressee_id = $1`,
      [adminId],
    );
    await queryRunner.query(
      `DELETE FROM "users" WHERE email IN ('minh.hoang@finora.internal', 'lan.anh@finora.internal', 'quoc.bao@finora.internal')`,
    );

    for (const friend of friendUsers) {
      await queryRunner.query(
        `INSERT INTO "users" (id, username, email, password, full_name, auth_provider, status, is_active)
         VALUES ($1, $2, $3, '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO', $4, 'LOCAL', 'ACTIVE', true)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
        [friend.id, friend.username, friend.email, friend.fullName],
      );

      // Tạo quan hệ bạn bè (Friendship) giữa Admin và các bạn bè
      await queryRunner.query(
        `INSERT INTO "friendships" (id, requester_id, addressee_id, status, responded_at)
         VALUES (uuid_generate_v4(), $1, $2, 'ACCEPTED', now())
         ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'ACCEPTED'`,
        [adminId, friend.id],
      );
    }
    console.log(` ✅ Đã khởi tạo 3 tài khoản bạn bè và liên kết quan hệ bạn bè với Admin.`);

    // -------------------------------------------------------------------------
    // BƯỚC 2: KHỞI TẠO CÁC VÍ (WALLETS) CHO ADMIN
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Khởi tạo các ví chi tiêu & quỹ cho Admin...');
    const wallet1Id = 'a1111111-1111-4111-a111-111111111111'; // Ví cá nhân (UUID v4 chuẩn)
    const wallet2Id = 'a2222222-2222-4222-a222-222222222222'; // Quỹ chung gia đình (UUID v4 chuẩn)

    // Xóa các dữ liệu cũ của ví không chuẩn UUID trước nếu có
    await queryRunner.query(`DELETE FROM "chat_messages" WHERE user_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "pending_actions" WHERE user_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "expense_splits" WHERE created_by_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "loan_payments" WHERE account_id IN (SELECT id FROM accounts WHERE wallet_id IN (SELECT id FROM wallets WHERE owner_id = $1))`, [adminId]);
    await queryRunner.query(`DELETE FROM "loans" WHERE created_by = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "budgets" WHERE wallet_id IN (SELECT id FROM wallets WHERE owner_id = $1)`, [adminId]);
    await queryRunner.query(`DELETE FROM "transactions" WHERE created_by = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "accounts" WHERE wallet_id IN (SELECT id FROM wallets WHERE owner_id = $1)`, [adminId]);
    await queryRunner.query(`DELETE FROM "wallet_members" WHERE user_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "wallets" WHERE owner_id = $1`, [adminId]);

    await queryRunner.query(
      `INSERT INTO "wallets" (id, owner_id, name, default_currency, type, is_shared, is_active, icon, description)
       VALUES 
       ($1, $2, 'Ví Chi Tiêu Cá Nhân', 'VND', 'PERSONAL', false, true, 'wallet-outline', 'Ví quản lý chi tiêu sinh hoạt, công việc hàng ngày của Admin'),
       ($3, $2, 'Quỹ Đầu Tư & Gia Đình', 'VND', 'SHARED', true, true, 'home-outline', 'Quỹ tích lũy đầu tư và chi tiêu chung cho gia đình')
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name,
         is_active = true,
         description = EXCLUDED.description`,
      [wallet1Id, adminId, wallet2Id],
    );

    // Wallet members
    // Ví 1: Admin là OWNER
    await queryRunner.query(
      `INSERT INTO "wallet_members" (id, wallet_id, user_id, role, status)
       VALUES (uuid_generate_v4(), $1, $2, 'owner', 'accepted')
       ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = 'owner', status = 'accepted'`,
      [wallet1Id, adminId],
    );

    // Ví 2: Admin là OWNER, Lan Anh là EDITOR, Quốc Bảo là VIEWER
    await queryRunner.query(
      `INSERT INTO "wallet_members" (id, wallet_id, user_id, role, status)
       VALUES 
       (uuid_generate_v4(), $1, $2, 'owner', 'accepted'),
       (uuid_generate_v4(), $1, $3, 'editor', 'accepted'),
       (uuid_generate_v4(), $1, $4, 'viewer', 'accepted')
       ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status`,
      [wallet2Id, adminId, friendUsers[1].id, friendUsers[2].id],
    );
    console.log(` ✅ Đã tạo 2 Ví: 'Ví Chi Tiêu Cá Nhân' & 'Quỹ Đầu Tư & Gia Đình' kèm phân quyền thành viên.`);

    // -------------------------------------------------------------------------
    // BƯỚC 3: KHỞI TẠO TÀI KHOẢN (ACCOUNTS) VỚI SỐ DƯ 174,000,000 VND
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Khởi tạo các tài khoản thanh toán, ngân hàng, ví điện tử...');
    const accCashId = 'c1111111-1111-4111-a111-111111111111';
    const accVcbId  = 'c2222222-2222-4222-a222-222222222222';
    const accTcbId  = 'c3333333-3333-4333-a333-333333333333';
    const accMomoId = 'c4444444-4444-4444-a444-444444444444';

    await queryRunner.query(
      `INSERT INTO "accounts" (id, wallet_id, name, type, currency, balance, initial_balance, account_number_last4, bank_code, color, created_by)
       VALUES 
       ($1, $5, 'Tiền Mặt Sẵn Có', 'CASH', 'VND', 5000000.00, 5000000.00, NULL, NULL, '#10B981', $6),
       ($2, $5, 'Vietcombank DigiBank', 'BANK_ACCOUNT', 'VND', 45500000.00, 45500000.00, '6868', 'VCB', '#059669', $6),
       ($3, $5, 'Techcombank Tiết Kiệm', 'BANK_ACCOUNT', 'VND', 120000000.00, 120000000.00, '8998', 'TCB', '#DC2626', $6),
       ($4, $5, 'Ví MoMo Pay', 'E_WALLET', 'VND', 3500000.00, 3500000.00, '9012', 'MOMO', '#EC4899', $6)
       ON CONFLICT (id) DO UPDATE SET 
         balance = EXCLUDED.balance,
         name = EXCLUDED.name`,
      [accCashId, accVcbId, accTcbId, accMomoId, wallet1Id, adminId],
    );
    console.log(` ✅ Đã tạo 4 tài khoản: Tiền mặt (5M) + VCB (45.5M) + TCB (120M) + MoMo (3.5M).`);
    console.log(`    💰 Tổng tài sản ròng = 174,000,000 VND -> Tương ứng Linh vật Jade (100M - 500M).`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: KHỞI TẠO DANH MỤC THU / CHI (CATEGORIES)
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Khởi tạo danh mục chuẩn cho thu và chi...');
    const catFoodId       = 'd1000000-0000-4000-a000-000000000001';
    const catTransportId  = 'd1000000-0000-4000-a000-000000000002';
    const catShoppingId   = 'd1000000-0000-4000-a000-000000000003';
    const catUtilityId    = 'd1000000-0000-4000-a000-000000000004';
    const catEntId        = 'd1000000-0000-4000-a000-000000000005';
    const catHealthId     = 'd1000000-0000-4000-a000-000000000006';
    const catEduId        = 'd1000000-0000-4000-a000-000000000007';

    const catSalaryId     = 'd2000000-0000-4000-a000-000000000001';
    const catBonusId      = 'd2000000-0000-4000-a000-000000000002';
    const catInvestId     = 'd2000000-0000-4000-a000-000000000003';
    const catGiftId       = 'd2000000-0000-4000-a000-000000000004';

    const categories = [
      { id: catFoodId, name: 'Ăn uống & Cà phê', type: 'EXPENSE', icon: 'fast-food-outline', color: '#F59E0B', order: 1 },
      { id: catTransportId, name: 'Di chuyển & Xăng xe', type: 'EXPENSE', icon: 'car-outline', color: '#3B82F6', order: 2 },
      { id: catShoppingId, name: 'Mua sắm & Đồ dùng', type: 'EXPENSE', icon: 'cart-outline', color: '#EC4899', order: 3 },
      { id: catUtilityId, name: 'Hóa đơn & Tiện ích', type: 'EXPENSE', icon: 'flash-outline', color: '#8B5CF6', order: 4 },
      { id: catEntId, name: 'Giải trí & Du lịch', type: 'EXPENSE', icon: 'game-controller-outline', color: '#10B981', order: 5 },
      { id: catHealthId, name: 'Sức khỏe & Y tế', type: 'EXPENSE', icon: 'medkit-outline', color: '#EF4444', order: 6 },
      { id: catEduId, name: 'Giáo dục & Khóa học', type: 'EXPENSE', icon: 'school-outline', color: '#6366F1', order: 7 },

      { id: catSalaryId, name: 'Lương hàng tháng', type: 'INCOME', icon: 'cash-outline', color: '#10B981', order: 10 },
      { id: catBonusId, name: 'Thưởng hiệu suất', type: 'INCOME', icon: 'trophy-outline', color: '#F59E0B', order: 11 },
      { id: catInvestId, name: 'Lợi nhuận đầu tư', type: 'INCOME', icon: 'trending-up-outline', color: '#3B82F6', order: 12 },
      { id: catGiftId, name: 'Khác & Quà tặng', type: 'INCOME', icon: 'gift-outline', color: '#A855F7', order: 13 },
    ];

    for (const cat of categories) {
      await queryRunner.query(
        `INSERT INTO "categories" (id, user_id, name, type, icon, color, display_order, is_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           color = EXCLUDED.color`,
        [cat.id, adminId, cat.name, cat.type, cat.icon, cat.color, cat.order],
      );
    }
    console.log(` ✅ Đã tạo ${categories.length} danh mục chuẩn (Ăn uống, Di chuyển, Mua sắm, Lương, Thưởng,...).`);

    // -------------------------------------------------------------------------
    // BƯỚC 5: KHỞI TẠO 38 GIAO DỊCH THỰC TẾ (TRANSACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Khởi tạo 38 giao dịch đa kênh (Thủ công, Giọng nói, Quét hóa đơn OCR, Thông báo ngân hàng, Chat)...');
    
    // Xóa bớt transactions cũ tạo từ seed trước đó nếu có (idempotent seed)
    await queryRunner.query(`DELETE FROM "transactions" WHERE created_by = $1`, [adminId]);

    const txRecords = [
      // --- THU NHẬP (INCOME) ---
      {
        accId: accVcbId, catId: catSalaryId, type: 'INCOME', amount: 38000000,
        name: 'Lương tháng 08/2026', note: 'Chuyển khoản lương công ty Finora Global',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-05T09:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catBonusId, type: 'INCOME', amount: 12000000,
        name: 'Thưởng dự án AI Assistant Q3', note: 'Thưởng hiệu suất vượt chỉ tiêu Q3',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-09-20T14:30:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catSalaryId, type: 'INCOME', amount: 38000000,
        name: 'Lương tháng 09/2026', note: 'Chuyển khoản lương công ty Finora Global',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-05T09:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accTcbId, catId: catInvestId, type: 'INCOME', amount: 3850000,
        name: 'Lãi tiền gửi tiết kiệm Techcombank', note: 'Tiền lãi định kỳ quý 3',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-15T10:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accMomoId, catId: catGiftId, type: 'INCOME', amount: 1000000,
        name: 'Lì xì & Chúc mừng sinh nhật', note: 'Bạn bè mừng sinh nhật qua MoMo',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-18T19:00:00Z', loc: 'Hà Nội'
      },

      // --- CHI TIÊU QUA GIỌNG NÓI (VOICE) ---
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 65000,
        name: 'Ăn sáng phở Thìn Lò Đúc', note: 'Ghi nhận qua lệnh giọng nói: "Ghi cho anh ăn sáng phở Thìn 65k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-06T07:45:00Z', loc: '13 Lò Đúc, Hai Bà Trưng'
      },
      {
        accId: accMomoId, catId: catFoodId, type: 'EXPENSE', amount: 55000,
        name: 'Highlands Coffee Tràng Tiền', note: 'Ghi nhận qua giọng nói: "Vừa uống cafe Highlands 55k bằng MoMo"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-08T15:20:00Z', loc: 'Tràng Tiền Plaza, Hoàn Kiếm'
      },
      {
        accId: accCashId, catId: catTransportId, type: 'EXPENSE', amount: 90000,
        name: 'Đổ xăng xe máy Petrolimex', note: 'Ghi nhận qua giọng nói: "Đổ xăng xe máy 90k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-10T18:15:00Z', loc: 'Cây xăng Trần Quang Khải'
      },
      {
        accId: accTcbId, catId: catFoodId, type: 'EXPENSE', amount: 350000,
        name: 'Pizza 4P’s Phan Chu Trinh', note: 'Ghi nhận qua giọng nói: "Ăn pizza 4P’s 350k quẹt thẻ Techcombank"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-12T19:30:00Z', loc: 'Phan Chu Trinh, Hoàn Kiếm'
      },
      {
        accId: accMomoId, catId: catTransportId, type: 'EXPENSE', amount: 48000,
        name: 'GrabBike đi gặp đối tác', note: 'Ghi nhận qua giọng nói: "Đi grab 48k bằng MoMo"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-14T09:10:00Z', loc: 'Quận Cầu Giấy'
      },

      // --- CHI TIÊU QUA QUÉT HÓA ĐƠN (RECEIPT_SCAN) ---
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 450000,
        name: 'Đi siêu thị WinMart Times City', note: 'Quét hóa đơn siêu thị WinMart, chi tiết: Sữa tươi, Trái cây, Bánh mì',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-07T18:40:00Z', loc: 'WinMart Times City'
      },
      {
        accId: accMomoId, catId: catHealthId, type: 'EXPENSE', amount: 215000,
        name: 'Mua thuốc & Vitamin Pharmacity', note: 'Hóa đơn quét OCR Pharmacity: Vitamin C, Panadol Extra',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-09T20:10:00Z', loc: 'Pharmacity Hai Bà Trưng'
      },
      {
        accId: accMomoId, catId: catEduId, type: 'EXPENSE', amount: 320000,
        name: 'Nhà sách Fahasa - Mua sách kỹ năng', note: 'Hóa đơn sách: Atomic Habits & Designing Data-Intensive Apps',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-11T16:30:00Z', loc: 'Fahasa Tràng Tiền'
      },
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 680000,
        name: 'Cơm niêu gia đình - Nhà hàng Kombo', note: 'Hóa đơn ăn tối 4 người cơm niêu Singapore',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-16T19:50:00Z', loc: 'Kombo Giảng Võ'
      },

      // --- CHI TIÊU QUA TRỢ LÝ AI CHAT (CHAT_TEXT) ---
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 50000,
        name: 'Ăn trưa bún chả Hương Liên', note: 'Nhập qua AI Chat: "vừa ăn bún chả 50k trả tiền mặt"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-13T12:30:00Z', loc: 'Lê Văn Hưu, Hà Nội'
      },
      {
        accId: accMomoId, catId: catUtilityId, type: 'EXPENSE', amount: 100000,
        name: 'Nạp cước điện thoại Viettel trả trước', note: 'Nhập qua AI Chat: "nạp tiền đt 100k qua momo"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-17T08:15:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catShoppingId, type: 'EXPENSE', amount: 1850000,
        name: 'Bàn phím cơ công thái học Keychron', note: 'Nhập qua AI Chat: "mua bàn phím keychron 1tr850 qua vietcombank"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-19T14:20:00Z', loc: 'Hà Nội'
      },

      // --- CHI TIÊU TỰ ĐỘNG QUA BIẾN ĐỘNG SỐ DƯ (BANK_NOTIFICATION) ---
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 1250000,
        name: 'Thanh toán tiền điện EVN Hà Nội', note: 'Trừ tiền tự động Auto-Debit EVN tháng 10',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-15T08:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 180000,
        name: 'Thanh toán tiền nước sinh hoạt Viwaco', note: 'Biến động số dư VCB thanh toán tiền nước',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-15T08:05:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 330000,
        name: 'Cước Internet cáp quang Viettel Net', note: 'Gói cáp quang tốc độ cao 300Mbps',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-15T08:10:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 8500000,
        name: 'Tiền thuê căn hộ chung cư tháng 10', note: 'Chuyển khoản tiền thuê nhà hàng tháng',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-01T10:00:00Z', loc: 'Hà Nội'
      },

      // --- CHI TIÊU THỦ CÔNG (MANUAL) ---
      {
        accId: accMomoId, catId: catEntId, type: 'EXPENSE', amount: 310000,
        name: 'Vé xem phim CGV IMAX Vincom', note: 'Xem phim Avatar 3 cùng bạn bè rạp Imax',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-18T20:30:00Z', loc: 'CGV Vincom Metropolis'
      },
      {
        accId: accVcbId, catId: catShoppingId, type: 'EXPENSE', amount: 2400000,
        name: 'Giày chạy bộ Nike Pegasus 41', note: 'Mua giày thể thao rèn luyện sức khỏe',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-04T15:00:00Z', loc: 'Nike Store Tràng Tiền'
      },
      {
        accId: accVcbId, catId: catHealthId, type: 'EXPENSE', amount: 1500000,
        name: 'Khám sức khỏe tổng quát định kỳ', note: 'Gói xét nghiệm và kiểm tra sức khỏe tại Medlatec',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-25T08:30:00Z', loc: 'Bệnh viện Medlatec'
      },
      {
        accId: accVcbId, catId: catEduId, type: 'EXPENSE', amount: 2200000,
        name: 'Khóa học AWS Solution Architect Pro', note: 'Đăng ký thi chứng chỉ Cloud Computing',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-28T21:00:00Z', loc: 'Online'
      },

      // GIAO DỊCH DÙNG ĐỂ CHIA TIỀN (SPLIT EXPENSE)
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 1200000,
        name: 'Tiệc BBQ liên hoan cùng đồng nghiệp', note: 'Admin đại diện thanh toán cả bàn nướng BBQ Gyu-Kaku',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-22T20:00:00Z', loc: 'Gyu-Kaku Japanese BBQ Vincom'
      },

      // GIAO DỊCH ĐANG CHỜ XÁC NHẬN (PENDING_CONFIRMATION - OCR)
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 85000,
        name: 'Cơm tấm đêm Bà Rọi', note: 'Giao dịch OCR quét hóa đơn cơm tấm đang chờ người dùng bấm xác nhận',
        source: 'RECEIPT_SCAN', status: 'PENDING_CONFIRMATION', visibility: 'PRIVATE',
        date: '2026-10-25T18:30:00Z', loc: 'Cơm tấm đêm Hàng Da'
      },
    ];

    let splitTxId = '';
    let pendingTxId = '';

    for (const tx of txRecords) {
      const inserted = await queryRunner.query(
        `INSERT INTO "transactions" (
          id, account_id, created_by, category_id, type, amount, currency, name, note,
          source, status, visibility, transaction_date, location_name
         ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, 'VND', $6, $7,
          $8, $9, $10, $11, $12
         ) RETURNING id`,
        [
          tx.accId, adminId, tx.catId, tx.type, tx.amount, tx.name, tx.note,
          tx.source, tx.status, tx.visibility, tx.date, tx.loc,
        ],
      );

      if (tx.name.includes('Tiệc BBQ')) {
        splitTxId = inserted[0].id;
      }
      if (tx.status === 'PENDING_CONFIRMATION') {
        pendingTxId = inserted[0].id;
      }
    }
    console.log(` ✅ Đã nạp thành công ${txRecords.length} giao dịch đa kênh cho Admin.`);

    // -------------------------------------------------------------------------
    // BƯỚC 6: KHỞI TẠO HẠN MỨC NGÂN SÁCH (BUDGETS) THÁNG 10/2026
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Khởi tạo ngân sách định kỳ tháng 10/2026...');
    await queryRunner.query(`DELETE FROM "budgets" WHERE wallet_id = $1`, [wallet1Id]);

    const budgetsData = [
      { catId: catFoodId, limit: 6000000, spent: 3420000 },
      { catId: catTransportId, limit: 1500000, spent: 580000 },
      { catId: catShoppingId, limit: 4000000, spent: 2850000 },
      { catId: catEntId, limit: 2500000, spent: 1150000 },
      { catId: catUtilityId, limit: 12000000, spent: 10260000 },
    ];

    for (const b of budgetsData) {
      const budgetRes = await queryRunner.query(
        `INSERT INTO "budgets" (id, wallet_id, category_id, limit_amount, period, start_date, is_rollover)
         VALUES (uuid_generate_v4(), $1, $2, $3, 'monthly', '2026-10-01', true)
         RETURNING id`,
        [wallet1Id, b.catId, b.limit],
      );

      const bId = budgetRes[0].id;
      await queryRunner.query(
        `INSERT INTO "budget_periods" (id, budget_id, start_date, end_date, limit_amount, spent_amount, rollover_amount, warning_alert_sent, exceeded_alert_sent)
         VALUES (uuid_generate_v4(), $1, '2026-10-01', '2026-10-31', $2, $3, 0, false, false)`,
        [bId, b.limit, b.spent],
      );
    }
    console.log(` ✅ Đã tạo 5 hạn mức ngân sách tháng 10/2026 và đồng bộ bảng budget_periods.`);

    // -------------------------------------------------------------------------
    // BƯỚC 7: KHỞI TẠO KHOẢN VAY / CHO VAY (LOANS & PAYMENTS)
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Khởi tạo khoản cho vay & đi vay kèm lịch sử hoàn ứng...');
    await queryRunner.query(`DELETE FROM "loans" WHERE created_by = $1`, [adminId]);

    // Khoản 1: Admin cho Hoàng Văn Minh mượn 10 triệu, đã hoàn 3 triệu, còn 7 triệu
    const loan1Res = await queryRunner.query(
      `INSERT INTO "loans" (
        id, wallet_id, account_id, created_by, counterparty_user_id, type, contact_name,
        contact_info, principal_amount, remaining_amount, currency, note, loan_date, due_date, status
       ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'LENT', 'Hoàng Văn Minh',
        '0988776655', 10000000.00, 7000000.00, 'VND', 'Cho Minh mượn sắm đồ án và nâng cấp máy tính',
        '2026-09-10T10:00:00Z', '2026-11-30T10:00:00Z', 'ACTIVE'
       ) RETURNING id`,
      [wallet1Id, accVcbId, adminId, friendUsers[0].id],
    );
    const loan1Id = loan1Res[0].id;

    await queryRunner.query(
      `INSERT INTO "loan_payments" (id, loan_id, account_id, amount, note, payment_date)
       VALUES (uuid_generate_v4(), $1, $2, 3000000.00, 'Minh chuyển khoản trả đợt 1', '2026-10-15T15:00:00Z')`,
      [loan1Id, accVcbId],
    );

    // Khoản 2: Admin vay ngân hàng Techcombank 15 triệu mua thiết bị công nghệ, đã trả 10 triệu, còn 5 triệu
    const loan2Res = await queryRunner.query(
      `INSERT INTO "loans" (
        id, wallet_id, account_id, created_by, counterparty_user_id, type, contact_name,
        contact_info, principal_amount, remaining_amount, currency, note, loan_date, due_date, status
       ) VALUES (
        uuid_generate_v4(), $1, $2, $3, NULL, 'BORROWED', 'Techcombank Consumer Loan',
        'Hotline 1800588822', 15000000.00, 5000000.00, 'VND', 'Trả góp thiết bị công nghệ văn phòng 0% lãi suất',
        '2026-08-15T09:00:00Z', '2026-11-15T09:00:00Z', 'ACTIVE'
       ) RETURNING id`,
      [wallet1Id, accTcbId, adminId],
    );
    const loan2Id = loan2Res[0].id;

    await queryRunner.query(
      `INSERT INTO "loan_payments" (id, loan_id, account_id, amount, note, payment_date)
       VALUES 
       (uuid_generate_v4(), $1, $2, 5000000.00, 'Trả góp tháng 9/2026', '2026-09-20T10:00:00Z'),
       (uuid_generate_v4(), $1, $2, 5000000.00, 'Trả góp tháng 10/2026', '2026-10-20T10:00:00Z')`,
      [loan2Id, accTcbId],
    );
    console.log(` ✅ Đã tạo 2 khoản Loan (Cho bạn vay 10M + Vay trả góp 15M) kèm các lượt thanh toán LoanPayment.`);

    // -------------------------------------------------------------------------
    // BƯỚC 8: KHỞI TẠO CHIA TIỀN NHÓM (SPLIT EXPENSES)
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Khởi tạo nhóm chia sẻ chi phí (Split Expense - Tiệc BBQ 1.2M)...');
    if (splitTxId) {
      await queryRunner.query(`DELETE FROM "expense_splits" WHERE transaction_id = $1`, [splitTxId]);

      const splitRes = await queryRunner.query(
        `INSERT INTO "expense_splits" (id, transaction_id, wallet_id, created_by_id, total_amount, split_type, status)
         VALUES (uuid_generate_v4(), $1, $2, $3, 1200000.00, 'equal', 'pending')
         RETURNING id`,
        [splitTxId, wallet1Id, adminId],
      );
      const splitId = splitRes[0].id;

      // 3 người: Admin (đã trả), Minh (đã chuyển khoản lại 400k), Lan Anh (chưa chuyển 400k)
      await queryRunner.query(
        `INSERT INTO "split_participants" (id, split_id, user_id, assigned_amount, status, note, is_settled)
         VALUES 
         (uuid_generate_v4(), $1, $2, 400000.00, 'accepted', 'Admin chi trả chính', true),
         (uuid_generate_v4(), $1, $3, 400000.00, 'accepted', 'Minh đã chuyển khoản lại qua MoMo', true),
         (uuid_generate_v4(), $1, $4, 400000.00, 'pending', 'Chờ Lan Anh chuyển khoản 400.000 VND', false)`,
        [splitId, adminId, friendUsers[0].id, friendUsers[1].id],
      );
      console.log(` ✅ Đã thiết lập SplitExpense chia đều 3 người cho tiệc BBQ (Admin, Minh, Lan Anh).`);
    }

    // -------------------------------------------------------------------------
    // BƯỚC 9: KHỞI TẠO TIN NHẮN AI CHAT & HÀNH ĐỘNG CHỜ PHÊ DUYỆT (PENDING ACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Khởi tạo lịch sử đối thoại với AI Mascot Jade và Pending Action...');
    await queryRunner.query(`DELETE FROM "pending_actions" WHERE user_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "chat_messages" WHERE user_id = $1`, [adminId]);

    const chatMessages = [
      {
        role: 'USER', type: 'TEXT',
        text: 'Chào Jade! Tình hình tài chính tháng này của tôi hiện tại như thế nào?',
        intent: 'financial_summary', mascot: 'jade', payload: null,
      },
      {
        role: 'ASSISTANT', type: 'TEXT',
        text: 'Xin chào! Tôi là Jade, người đồng hành tài chính của bạn. Hiện tại tổng tài sản ròng khả dụng của bạn đạt 174,000,000 VND, đưa bạn vào nhóm Tài sản Tinh tế & Thịnh vượng! Trong tháng 10 này, bạn đã tiết kiệm được 45% tổng thu nhập, mọi khoản chi tiêu lớn đều nằm trong tầm kiểm soát.',
        intent: 'financial_summary', mascot: 'jade',
        payload: {
          net_worth: 174000000,
          tier: 'jade',
          total_income_this_month: 42850000,
          total_expense_this_month: 18278000,
        },
      },
      {
        role: 'USER', type: 'TEXT',
        text: 'Tôi vừa quét hóa đơn ăn đêm cơm tấm Bà Rọi 85.000đ trả bằng tiền mặt lúc nãy.',
        intent: 'create_transaction', mascot: 'jade', payload: null,
      },
      {
        role: 'ASSISTANT', type: 'CONFIRMATION_PROMPT',
        text: 'Tôi đã trích xuất từ hóa đơn: Ăn cơm tấm đêm Bà Rọi - 85,000 VND (Danh mục: Ăn uống & Cà phê, Nguồn tiền: Tiền mặt). Bạn có muốn tôi ghi nhận vào sổ thu chi ngay không?',
        intent: 'create_transaction', mascot: 'jade',
        payload: {
          transaction_name: 'Cơm tấm đêm Bà Rọi',
          amount: 85000,
          category: 'Ăn uống & Cà phê',
          account: 'Tiền Mặt Sẵn Có',
        },
      },
    ];

    let lastAssistantMsgId = '';
    for (const msg of chatMessages) {
      const msgRes = await queryRunner.query(
        `INSERT INTO "chat_messages" (id, user_id, wallet_id, role, message_type, text_content, intent, mascot, payload_json)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [adminId, wallet1Id, msg.role, msg.type, msg.text, msg.intent, msg.mascot, msg.payload ? JSON.stringify(msg.payload) : null],
      );
      if (msg.role === 'ASSISTANT' && msg.type === 'CONFIRMATION_PROMPT') {
        lastAssistantMsgId = msgRes[0].id;
      }
    }

    // 1 Pending Action chờ người dùng bấm xác nhận
    await queryRunner.query(
      `INSERT INTO "pending_actions" (
        id, user_id, wallet_id, chat_message_id, transaction_id, tool_name,
        tool_input, preview_payload, status, expires_at
       ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'create_transaction',
        $5, $6, 'PENDING', now() + interval '24 hours'
       )`,
      [
        adminId, wallet1Id, lastAssistantMsgId || null, pendingTxId || null,
        JSON.stringify({
          amount: 85000,
          category: 'Ăn uống & Cà phê',
          account: 'Tiền Mặt Sẵn Có',
          name: 'Cơm tấm đêm Bà Rọi',
        }),
        JSON.stringify({
          amount: 85000,
          category_name: 'Ăn uống & Cà phê',
          account_name: 'Tiền Mặt Sẵn Có',
          date: '2026-10-25',
          prompt: 'Xác nhận tạo giao dịch 85,000 VND?',
        }),
      ],
    );
    console.log(` ✅ Đã khởi tạo 4 tin nhắn AI Chat và 1 PendingAction chờ Admin duyệt.`);

    // -------------------------------------------------------------------------
    // BƯỚC 10: TẠO THÔNG BÁO HỆ THỐNG MẪU (NOTIFICATIONS)
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Khởi tạo các thông báo hệ thống dành cho Admin...');
    await queryRunner.query(`DELETE FROM "notifications" WHERE user_id = $1`, [adminId]);

    const sampleNotifications = [
      {
        type: 'ASSET_TIER_UP',
        title: 'Chúc mừng thăng hạng Linh Vật!',
        body: 'Tổng tài sản của bạn đã vượt mốc 100,000,000 VND. Bạn đã vinh dự đạt cấp độ Linh Vật Jade (Ngọc Bích)!',
        isRead: false,
      },
      {
        type: 'BUDGET_WARNING',
        title: 'Cảnh báo ngân sách Hóa đơn & Tiện ích',
        body: 'Ngân sách Hóa đơn tháng này đã tiêu dùng 85.5% (10,260,000 / 12,000,000 VND).',
        isRead: false,
      },
      {
        type: 'LOAN_PAYMENT_RECEIVED',
        title: 'Nhận tiền hoàn ứng khoản vay',
        body: 'Hoàng Văn Minh đã thanh toán 3,000,000 VND cho khoản vay làm đồ án.',
        isRead: true,
      },
      {
        type: 'SPLIT_REQUEST',
        title: 'Đã gửi yêu cầu chia tiền',
        body: 'Yêu cầu chia tiền tiệc BBQ (400,000 VND/người) đã được gửi tới Lan Anh và Minh.',
        isRead: true,
      },
    ];

    for (const notif of sampleNotifications) {
      await queryRunner.query(
        `INSERT INTO "notifications" (id, user_id, type, title, body, is_read, read_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
        [adminId, notif.type, notif.title, notif.body, notif.isRead, notif.isRead ? new Date() : null],
      );
    }
    console.log(` ✅ Đã tạo ${sampleNotifications.length} thông báo trong bảng notifications.`);

    // Commit Transaction
    await queryRunner.commitTransaction();

    console.log('\n========================================================');
    console.log('🎉 MIGRATE VÀ SEED DỮ LIỆU TOÀN DIỆN THÀNH CÔNG 100%! 🎉');
    console.log(`   Admin Email: admin@finora.com (ID: ${adminId})`);
    console.log(`   Tài khoản: 4 tài khoản (Tiền mặt, VCB, TCB, MoMo)`);
    console.log(`   Tổng tài sản: 174,000,000 VND -> Linh vật: Jade`);
    console.log(`   Giao dịch: 38 giao dịch (Manual, Voice, OCR, Bank, Chat)`);
    console.log(`   Ngân sách: 5 danh mục tháng 10/2026`);
    console.log(`   Khoản vay: 2 khoản (Lent & Borrowed)`);
    console.log(`   Chia sẻ: Tiệc BBQ 3 người`);
    console.log(`   AI Chat: 4 tin nhắn + 1 Pending Action`);
    console.log(`   Thông báo: 4 thông báo hệ thống`);
    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seedAdminDomainData().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
