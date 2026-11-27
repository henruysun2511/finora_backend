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
    console.log('\n[1/16] Xác minh tài khoản Admin và khởi tạo người dùng bổ trợ...');
    
    // Tìm hoặc tạo Admin id
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

    // Xóa liên kết bạn bè cũ của Admin trước
    await queryRunner.query(
      `DELETE FROM "friendships" WHERE requester_id = $1 OR addressee_id = $1`,
      [adminId],
    );

    for (const friend of friendUsers) {
      const existing = await queryRunner.query(
        `SELECT id FROM "users" WHERE email = $1 LIMIT 1`,
        [friend.email],
      );

      if (existing.length > 0) {
        friend.id = existing[0].id;
        await queryRunner.query(
          `UPDATE "users" SET full_name = $1, username = $2, is_active = true WHERE id = $3`,
          [friend.fullName, friend.username, friend.id],
        );
      } else {
        await queryRunner.query(
          `INSERT INTO "users" (id, username, email, password, full_name, auth_provider, status, is_active)
           VALUES ($1, $2, $3, '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO', $4, 'LOCAL', 'ACTIVE', true)
           ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
          [friend.id, friend.username, friend.email, friend.fullName],
        );
      }

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
    // BƯỚC 2: DỌN SẠCH TOÀN BỘ DỮ LIỆU TÀI CHÍNH CŨ CỦA ADMIN THEO THỨ TỰ KHÓA NGOẠI
    // -------------------------------------------------------------------------
    console.log('\n[2/16] Dọn sạch dữ liệu cũ theo đúng thứ tự ràng buộc khóa ngoại...');

    // 1. Audit logs
    await queryRunner.query(
      `DELETE FROM "audit_logs" WHERE user_id = $1 OR wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)`,
      [adminId],
    );

    // 2. Notifications
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE user_id = $1`,
      [adminId],
    );

    // 3. Message reactions
    await queryRunner.query(
      `DELETE FROM "message_reactions" WHERE user_id = $1 OR message_id IN (
         SELECT id FROM "direct_messages" WHERE sender_id = $1 OR receiver_id = $1
       )`,
      [adminId],
    );

    // 4. Direct messages
    await queryRunner.query(
      `DELETE FROM "direct_messages" WHERE sender_id = $1 OR receiver_id = $1`,
      [adminId],
    );

    // 5. Post reactions
    await queryRunner.query(
      `DELETE FROM "post_reactions" WHERE user_id = $1 OR transaction_id IN (
         SELECT id FROM "transactions" WHERE created_by = $1
       )`,
      [adminId],
    );

    // 6. Pending actions & Chat messages
    await queryRunner.query(`DELETE FROM "pending_actions" WHERE user_id = $1`, [adminId]);
    await queryRunner.query(`DELETE FROM "chat_messages" WHERE user_id = $1`, [adminId]);

    // 7. Split participants & Expense splits
    await queryRunner.query(
      `DELETE FROM "split_participants" WHERE user_id = $1 OR split_id IN (
         SELECT id FROM "expense_splits" WHERE created_by_id = $1
       )`,
      [adminId],
    );
    await queryRunner.query(`DELETE FROM "expense_splits" WHERE created_by_id = $1`, [adminId]);

    // 8. Loan payments & Loans
    await queryRunner.query(
      `DELETE FROM "loan_payments" WHERE loan_id IN (
         SELECT id FROM "loans" WHERE created_by = $1
       ) OR account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );
    await queryRunner.query(`DELETE FROM "loans" WHERE created_by = $1`, [adminId]);

    // 9. Transfers
    await queryRunner.query(
      `DELETE FROM "transfers" WHERE created_by = $1 OR from_account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       ) OR to_account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );

    // 10. Recurring transactions
    await queryRunner.query(
      `DELETE FROM "recurring_transactions" WHERE created_by = $1 OR wallet_id IN (
         SELECT id FROM "wallets" WHERE owner_id = $1
       )`,
      [adminId],
    );

    // 11. Transactions, Receipts, Account Balance Adjustments
    await queryRunner.query(
      `DELETE FROM "account_balance_adjustments" WHERE account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );
    await queryRunner.query(
      `DELETE FROM "transactions" WHERE created_by = $1 OR account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );
    await queryRunner.query(
      `DELETE FROM "receipts" WHERE account_id IN (
         SELECT id FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );

    // 12. Budget periods & Budgets
    await queryRunner.query(
      `DELETE FROM "budget_periods" WHERE budget_id IN (
         SELECT id FROM "budgets" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)
       )`,
      [adminId],
    );
    await queryRunner.query(
      `DELETE FROM "budgets" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)`,
      [adminId],
    );

    // 13. Accounts
    await queryRunner.query(
      `DELETE FROM "accounts" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1)`,
      [adminId],
    );

    // 14. Wallet members & Wallets
    await queryRunner.query(
      `DELETE FROM "wallet_members" WHERE wallet_id IN (SELECT id FROM "wallets" WHERE owner_id = $1) OR user_id = $1`,
      [adminId],
    );
    await queryRunner.query(`DELETE FROM "wallets" WHERE owner_id = $1`, [adminId]);

    console.log(` ✅ Đã dọn sạch 15 phân hệ tài chính cũ của Admin an toàn.`);

    // -------------------------------------------------------------------------
    // BƯỚC 3: KHỞI TẠO CÁC VÍ (WALLETS) CHO ADMIN
    // -------------------------------------------------------------------------
    console.log('\n[3/16] Khởi tạo các ví chi tiêu & quỹ chung...');
    const wallet1Id = 'a1111111-1111-4111-a111-111111111111'; // Ví cá nhân
    const wallet2Id = 'a2222222-2222-4222-a222-222222222222'; // Quỹ gia đình

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
    // Ví 1: Admin là owner
    await queryRunner.query(
      `INSERT INTO "wallet_members" (id, wallet_id, user_id, role, status)
       VALUES (uuid_generate_v4(), $1, $2, 'owner', 'accepted')
       ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = 'owner', status = 'accepted'`,
      [wallet1Id, adminId],
    );

    // Ví 2: Admin là owner, Lan Anh là editor, Quốc Bảo là viewer
    await queryRunner.query(
      `INSERT INTO "wallet_members" (id, wallet_id, user_id, role, status)
       VALUES 
       (uuid_generate_v4(), $1, $2, 'owner', 'accepted'),
       (uuid_generate_v4(), $1, $3, 'editor', 'accepted'),
       (uuid_generate_v4(), $1, $4, 'viewer', 'accepted')
       ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status`,
      [wallet2Id, adminId, friendUsers[1].id, friendUsers[2].id],
    );
    console.log(` ✅ Đã tạo 2 Ví kèm phân quyền thành viên (owner, editor, viewer).`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: KHỞI TẠO 5 TÀI KHOẢN (ACCOUNTS)
    // -------------------------------------------------------------------------
    console.log('\n[4/16] Khởi tạo các tài khoản thanh toán, ngân hàng, ví điện tử & ngoại tệ...');
    const accCashId   = 'c1111111-1111-4111-a111-111111111111';
    const accVcbId    = 'c2222222-2222-4222-a222-222222222222';
    const accTcbId    = 'c3333333-3333-4333-a333-333333333333';
    const accMomoId   = 'c4444444-4444-4444-a444-444444444444';
    const accUsdId    = 'c5555555-5555-4555-a555-555555555555';

    await queryRunner.query(
      `INSERT INTO "accounts" (id, wallet_id, name, type, currency, balance, initial_balance, account_number_last4, bank_code, color, created_by)
       VALUES 
       ($1, $6, 'Tiền Mặt Sẵn Có', 'CASH', 'VND', 8000000.00, 8000000.00, NULL, NULL, '#10B981', $7),
       ($2, $6, 'Vietcombank DigiBank', 'BANK_ACCOUNT', 'VND', 55000000.00, 55000000.00, '6868', 'VCB', '#059669', $7),
       ($3, $6, 'Techcombank Tiết Kiệm', 'BANK_ACCOUNT', 'VND', 100000000.00, 100000000.00, '8998', 'TCB', '#DC2626', $7),
       ($4, $6, 'Ví MoMo Pay', 'E_WALLET', 'VND', 7000000.00, 7000000.00, '9012', 'MOMO', '#EC4899', $7),
       ($5, $6, 'Tiền Mặt Ngoại Tệ USD', 'CASH', 'USD', 500.00, 500.00, NULL, NULL, '#F59E0B', $7)
       ON CONFLICT (id) DO UPDATE SET 
         balance = EXCLUDED.balance,
         name = EXCLUDED.name`,
      [accCashId, accVcbId, accTcbId, accMomoId, accUsdId, wallet1Id, adminId],
    );
    console.log(` ✅ Đã tạo 5 tài khoản: Tiền mặt (8M) + VCB (55M) + TCB (100M) + MoMo (7M) + USD Cash ($500 ~ 12.725M VND).`);
    console.log(`    💰 Tổng tài sản ròng = 180,725,000 VND -> Tương ứng Linh vật Jade (100M - 500M).`);

    // -------------------------------------------------------------------------
    // BƯỚC 5: KHỞI TẠO DANH MỤC THU / CHI (CATEGORIES)
    // -------------------------------------------------------------------------
    console.log('\n[5/16] Khởi tạo danh mục chuẩn cho thu và chi...');
    const catFoodId       = 'd1000000-0000-4000-a000-000000000001';
    const catTransportId  = 'd1000000-0000-4000-a000-000000000002';
    const catShoppingId   = 'd1000000-0000-4000-a000-000000000003';
    const catUtilityId    = 'd1000000-0000-4000-a000-000000000004';
    const catEntId        = 'd1000000-0000-4000-a000-000000000005';
    const catHealthId     = 'd1000000-0000-4000-a000-000000000006';
    const catEduId        = 'd1000000-0000-4000-a000-000000000007';
    const catHousingId    = 'd1000000-0000-4000-a000-000000000008';

    const catSalaryId     = 'd2000000-0000-4000-a000-000000000001';
    const catBonusId      = 'd2000000-0000-4000-a000-000000000002';
    const catInvestId     = 'd2000000-0000-4000-a000-000000000003';
    const catFreelanceId  = 'd2000000-0000-4000-a000-000000000004';
    const catGiftId       = 'd2000000-0000-4000-a000-000000000005';
    const catOtherIncId   = 'd2000000-0000-4000-a000-000000000006';

    const categories = [
      { id: catFoodId, name: 'Ăn uống & Cà phê', type: 'EXPENSE', icon: 'fast-food-outline', color: '#F59E0B', order: 1 },
      { id: catTransportId, name: 'Di chuyển & Xăng xe', type: 'EXPENSE', icon: 'car-outline', color: '#3B82F6', order: 2 },
      { id: catShoppingId, name: 'Mua sắm & Đồ dùng', type: 'EXPENSE', icon: 'cart-outline', color: '#EC4899', order: 3 },
      { id: catUtilityId, name: 'Hóa đơn & Tiện ích', type: 'EXPENSE', icon: 'flash-outline', color: '#8B5CF6', order: 4 },
      { id: catEntId, name: 'Giải trí & Du lịch', type: 'EXPENSE', icon: 'game-controller-outline', color: '#10B981', order: 5 },
      { id: catHealthId, name: 'Sức khỏe & Y tế', type: 'EXPENSE', icon: 'medkit-outline', color: '#EF4444', order: 6 },
      { id: catEduId, name: 'Giáo dục & Khóa học', type: 'EXPENSE', icon: 'school-outline', color: '#6366F1', order: 7 },
      { id: catHousingId, name: 'Nhà cửa & Tiền thuê', type: 'EXPENSE', icon: 'home-outline', color: '#14B8A6', order: 8 },

      { id: catSalaryId, name: 'Lương hàng tháng', type: 'INCOME', icon: 'cash-outline', color: '#10B981', order: 10 },
      { id: catBonusId, name: 'Thưởng hiệu suất', type: 'INCOME', icon: 'trophy-outline', color: '#F59E0B', order: 11 },
      { id: catInvestId, name: 'Lợi nhuận đầu tư', type: 'INCOME', icon: 'trending-up-outline', color: '#3B82F6', order: 12 },
      { id: catFreelanceId, name: 'Thu nhập Freelance', type: 'INCOME', icon: 'laptop-outline', color: '#8B5CF6', order: 13 },
      { id: catGiftId, name: 'Lì xì & Quà tặng', type: 'INCOME', icon: 'gift-outline', color: '#A855F7', order: 14 },
      { id: catOtherIncId, name: 'Thu nhập khác', type: 'INCOME', icon: 'wallet-outline', color: '#6B7280', order: 15 },
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
    console.log(` ✅ Đã tạo ${categories.length} danh mục thu chi chuẩn.`);

    // -------------------------------------------------------------------------
    // BƯỚC 6: KHỞI TẠO 45 GIAO DỊCH THỰC TẾ TRẢI DÀI 3 THÁNG (T9, T10, T11/2026)
    // -------------------------------------------------------------------------
    console.log('\n[6/16] Khởi tạo ~45 giao dịch đa kênh (Manual, Voice, OCR, Bank, Chat)...');

    const txRecords = [
      // === THÁNG 9/2026 ===
      {
        accId: accVcbId, catId: catSalaryId, type: 'INCOME', amount: 38000000,
        name: 'Lương tháng 08/2026', note: 'Chuyển khoản lương công ty Finora Global',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-05T09:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catHousingId, type: 'EXPENSE', amount: 8500000,
        name: 'Tiền thuê căn hộ tháng 9', note: 'Chuyển khoản cho chủ nhà',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-01T10:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 55000,
        name: 'Bún riêu cua Hàng Bạc', note: 'Ghi nhận bằng giọng nói: "Ghi bún riêu 55k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-08T08:15:00Z', loc: 'Hàng Bạc, Hoàn Kiếm'
      },
      {
        accId: accMomoId, catId: catTransportId, type: 'EXPENSE', amount: 45000,
        name: 'GrabBike đi làm', note: 'Ghi qua giọng nói: "Đi Grab 45k MoMo"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-12T08:30:00Z', loc: 'Cầu Giấy, Hà Nội'
      },
      {
        accId: accVcbId, catId: catBonusId, type: 'INCOME', amount: 15000000,
        name: 'Thưởng dự án AI Assistant Q3', note: 'Thưởng hoàn thành xuất sắc dự án Q3',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-09-20T14:30:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catHealthId, type: 'EXPENSE', amount: 1500000,
        name: 'Khám sức khỏe định kỳ Medlatec', note: 'Gói kiểm tra sức khỏe tổng quát',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-25T08:30:00Z', loc: 'Bệnh viện Medlatec'
      },
      {
        accId: accVcbId, catId: catEduId, type: 'EXPENSE', amount: 2200000,
        name: 'Khóa học AWS Solution Architect', note: 'Đăng ký ôn thi chứng chỉ AWS Pro',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-09-28T21:00:00Z', loc: 'Online'
      },

      // === THÁNG 10/2026 ===
      {
        accId: accVcbId, catId: catHousingId, type: 'EXPENSE', amount: 8500000,
        name: 'Tiền thuê căn hộ chung cư tháng 10', note: 'Chuyển khoản tiền thuê nhà hàng tháng',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-01T10:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catShoppingId, type: 'EXPENSE', amount: 2400000,
        name: 'Giày chạy bộ Nike Pegasus 41', note: 'Mua giày thể thao rèn luyện sức khỏe',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-04T15:00:00Z', loc: 'Nike Store Tràng Tiền'
      },
      {
        accId: accVcbId, catId: catSalaryId, type: 'INCOME', amount: 38000000,
        name: 'Lương tháng 09/2026', note: 'Chuyển khoản lương công ty Finora Global',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-05T09:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 65000,
        name: 'Ăn sáng phở Thìn Lò Đúc', note: 'Ghi nhận qua lệnh giọng nói: "Ghi cho anh ăn sáng phở Thìn 65k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-06T07:45:00Z', loc: '13 Lò Đúc, Hai Bà Trưng'
      },
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 450000,
        name: 'Đi siêu thị WinMart Times City', note: 'Quét hóa đơn siêu thị WinMart: Sữa tươi, Trái cây, Bánh mì',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-07T18:40:00Z', loc: 'WinMart Times City'
      },
      {
        accId: accMomoId, catId: catFoodId, type: 'EXPENSE', amount: 55000,
        name: 'Highlands Coffee Tràng Tiền', note: 'Ghi nhận qua giọng nói: "Vừa uống cafe Highlands 55k bằng MoMo"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-08T15:20:00Z', loc: 'Tràng Tiền Plaza, Hoàn Kiếm'
      },
      {
        accId: accMomoId, catId: catHealthId, type: 'EXPENSE', amount: 215000,
        name: 'Mua thuốc & Vitamin Pharmacity', note: 'Hóa đơn quét OCR Pharmacity: Vitamin C, Panadol Extra',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-09T20:10:00Z', loc: 'Pharmacity Hai Bà Trưng'
      },
      {
        accId: accCashId, catId: catTransportId, type: 'EXPENSE', amount: 90000,
        name: 'Đổ xăng xe máy Petrolimex', note: 'Ghi nhận qua giọng nói: "Đổ xăng xe máy 90k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-10T18:15:00Z', loc: 'Cây xăng Trần Quang Khải'
      },
      {
        accId: accMomoId, catId: catEduId, type: 'EXPENSE', amount: 320000,
        name: 'Nhà sách Fahasa - Mua sách kỹ năng', note: 'Hóa đơn sách: Atomic Habits & Designing Data-Intensive Apps',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-11T16:30:00Z', loc: 'Fahasa Tràng Tiền'
      },
      {
        accId: accTcbId, catId: catFoodId, type: 'EXPENSE', amount: 350000,
        name: 'Pizza 4P’s Phan Chu Trinh', note: 'Ghi nhận qua giọng nói: "Ăn pizza 4P’s 350k quẹt thẻ Techcombank"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-12T19:30:00Z', loc: 'Phan Chu Trinh, Hoàn Kiếm'
      },
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 50000,
        name: 'Ăn trưa bún chả Hương Liên', note: 'Nhập qua AI Chat: "vừa ăn bún chả 50k trả tiền mặt"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-13T12:30:00Z', loc: 'Lê Văn Hưu, Hà Nội'
      },
      {
        accId: accMomoId, catId: catTransportId, type: 'EXPENSE', amount: 48000,
        name: 'GrabBike đi gặp đối tác', note: 'Ghi nhận qua giọng nói: "Đi grab 48k bằng MoMo"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-14T09:10:00Z', loc: 'Quận Cầu Giấy'
      },
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
        accId: accTcbId, catId: catInvestId, type: 'INCOME', amount: 3850000,
        name: 'Lãi tiền gửi tiết kiệm Techcombank', note: 'Tiền lãi định kỳ quý 3',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-15T10:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 680000,
        name: 'Cơm niêu gia đình - Nhà hàng Kombo', note: 'Hóa đơn ăn tối 4 người cơm niêu Singapore',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-16T19:50:00Z', loc: 'Kombo Giảng Võ'
      },
      {
        accId: accMomoId, catId: catUtilityId, type: 'EXPENSE', amount: 100000,
        name: 'Nạp cước điện thoại Viettel trả trước', note: 'Nhập qua AI Chat: "nạp tiền đt 100k qua momo"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-10-17T08:15:00Z', loc: 'Hà Nội'
      },
      {
        accId: accMomoId, catId: catGiftId, type: 'INCOME', amount: 1000000,
        name: 'Lì xì & Chúc mừng sinh nhật', note: 'Bạn bè mừng sinh nhật qua MoMo',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-18T19:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accMomoId, catId: catEntId, type: 'EXPENSE', amount: 310000,
        name: 'Vé xem phim CGV IMAX Vincom', note: 'Xem phim Avatar 3 cùng bạn bè rạp Imax',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-18T20:30:00Z', loc: 'CGV Vincom Metropolis'
      },
      {
        accId: accVcbId, catId: catShoppingId, type: 'EXPENSE', amount: 1850000,
        name: 'Bàn phím cơ công thái học Keychron', note: 'Nhập qua AI Chat: "mua bàn phím keychron 1tr850 qua vietcombank"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-19T14:20:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 1200000,
        name: 'Tiệc BBQ liên hoan cùng đồng nghiệp', note: 'Admin đại diện thanh toán cả bàn nướng BBQ Gyu-Kaku',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-10-22T20:00:00Z', loc: 'Gyu-Kaku Japanese BBQ Vincom'
      },

      // === THÁNG 11/2026 (THÁNG HIỆN TẠI) ===
      {
        accId: accVcbId, catId: catHousingId, type: 'EXPENSE', amount: 8500000,
        name: 'Tiền thuê căn hộ chung cư tháng 11', note: 'Chuyển khoản tiền thuê nhà tháng 11',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-01T10:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catSalaryId, type: 'INCOME', amount: 38000000,
        name: 'Lương tháng 10/2026', note: 'Chuyển khoản lương công ty Finora Global',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-05T09:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catFreelanceId, type: 'INCOME', amount: 8500000,
        name: 'Thanh toán dự án tư vấn FinTech', note: 'Khách hàng thanh toán hợp đồng tư vấn kiến trúc',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-11-08T11:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 60000,
        name: 'Ăn sáng bánh cuốn Thanh Vân', note: 'Ghi qua giọng nói: "Bánh cuốn 60k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-09T08:00:00Z', loc: 'Hàng Gà, Hoàn Kiếm'
      },
      {
        accId: accMomoId, catId: catFoodId, type: 'EXPENSE', amount: 65000,
        name: 'Trà sữa Phúc Long Vincom', note: 'Ghi qua AI chat: "uống phúc long 65k qua momo"',
        source: 'CHAT_TEXT', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-11-10T16:00:00Z', loc: 'Vincom Bà Triệu'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 1180000,
        name: 'Hóa đơn tiền điện EVN tháng 11', note: 'Trừ tự động ngân hàng Vietcombank',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-15T08:00:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 165000,
        name: 'Hóa đơn nước sinh hoạt Viwaco', note: 'Trừ tự động ngân hàng',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-15T08:05:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catUtilityId, type: 'EXPENSE', amount: 330000,
        name: 'Cước Internet Viettel tháng 11', note: 'Cước cố định cáp quang',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-15T08:10:00Z', loc: 'Hà Nội'
      },
      {
        accId: accVcbId, catId: catFoodId, type: 'EXPENSE', amount: 1500000,
        name: 'Dã ngoại cắm trại Ba Vì cuối tuần', note: 'Admin ứng trước thanh toán tiệc nướng dã ngoại cùng nhóm bạn',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-11-16T17:00:00Z', loc: 'Ba Vì, Hà Nội'
      },
      {
        accId: accMomoId, catId: catShoppingId, type: 'EXPENSE', amount: 890000,
        name: 'Áo khoác gió Uniqlo chống nước', note: 'Mua sắm thời trang mùa đông Uniqlo',
        source: 'MANUAL', status: 'CONFIRMED', visibility: 'FRIENDS',
        date: '2026-11-18T19:30:00Z', loc: 'Uniqlo Vincom Phạm Ngọc Thạch'
      },
      {
        accId: accMomoId, catId: catEntId, type: 'EXPENSE', amount: 260000,
        name: 'Gói cước Netflix Premium 4K', note: 'Gia hạn gói xem phim trực tuyến định kỳ',
        source: 'BANK_NOTIFICATION', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-15T02:00:00Z', loc: 'Online'
      },
      {
        accId: accVcbId, catId: catShoppingId, type: 'EXPENSE', amount: 1250000,
        name: 'Nồi chiên không dầu Lock&Lock', note: 'Quét hóa đơn mua đồ dùng nhà bếp Lock&Lock',
        source: 'RECEIPT_SCAN', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-20T14:15:00Z', loc: 'Lock&Lock Aeon Mall'
      },
      {
        accId: accCashId, catId: catTransportId, type: 'EXPENSE', amount: 100000,
        name: 'Bảo dưỡng & Thay dầu xe máy', note: 'Ghi nhận qua giọng nói: "Thay dầu xe máy 100k tiền mặt"',
        source: 'VOICE', status: 'CONFIRMED', visibility: 'PRIVATE',
        date: '2026-11-22T10:30:00Z', loc: 'Head Honda Hai Bà Trưng'
      },
      {
        accId: accCashId, catId: catFoodId, type: 'EXPENSE', amount: 85000,
        name: 'Cơm tấm đêm Bà Rọi', note: 'Giao dịch OCR quét hóa đơn cơm tấm đang chờ người dùng bấm xác nhận',
        source: 'RECEIPT_SCAN', status: 'PENDING_CONFIRMATION', visibility: 'PRIVATE',
        date: '2026-11-26T21:30:00Z', loc: 'Cơm tấm đêm Hàng Da'
      },
    ];

    let splitBbqTxId = '';
    let splitCampingTxId = '';
    let pendingTxId = '';
    let publicFeedTxId = '';

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

      const txId = inserted[0].id;
      if (tx.name.includes('Tiệc BBQ')) splitBbqTxId = txId;
      if (tx.name.includes('Dã ngoại')) {
        splitCampingTxId = txId;
        publicFeedTxId = txId;
      }
      if (tx.status === 'PENDING_CONFIRMATION') pendingTxId = txId;
    }
    console.log(` ✅ Đã nạp thành công ${txRecords.length} giao dịch đa kênh cho Admin.`);

    // -------------------------------------------------------------------------
    // BƯỚC 7: KHỞI TẠO CHUYỂN TIỀN NỘI BỘ & ĐỔI NGOẠI TỆ (TRANSFERS)
    // -------------------------------------------------------------------------
    console.log('\n[7/16] Khởi tạo giao dịch chuyển tiền nội bộ và đổi ngoại tệ...');
    const transferRecords = [
      {
        fromAcc: accVcbId, toAcc: accCashId,
        fromAmt: 5000000, fromCur: 'VND',
        toAmt: 5000000, toCur: 'VND',
        rate: 1, fee: 0,
        note: 'Rút tiền mặt tại cây ATM Vietcombank phục vụ chi tiêu sinh hoạt',
        date: '2026-10-05T11:00:00Z',
      },
      {
        fromAcc: accVcbId, toAcc: accMomoId,
        fromAmt: 2000000, fromCur: 'VND',
        toAmt: 2000000, toCur: 'VND',
        rate: 1, fee: 0,
        note: 'Nạp tiền ví MoMo Pay từ Vietcombank',
        date: '2026-10-15T16:30:00Z',
      },
      {
        fromAcc: accVcbId, toAcc: accUsdId,
        fromAmt: 12725000, fromCur: 'VND',
        toAmt: 500, toCur: 'USD',
        rate: 25450, fee: 20000,
        note: 'Mua 500 USD tiền mặt chuẩn bị cho chuyến công tác Singapore',
        date: '2026-11-01T14:00:00Z',
      },
      {
        fromAcc: accVcbId, toAcc: accMomoId,
        fromAmt: 1500000, fromCur: 'VND',
        toAmt: 1500000, toCur: 'VND',
        rate: 1, fee: 0,
        note: 'Nạp thêm tiền ví MoMo săn sale và mua sắm cuối năm',
        date: '2026-11-10T10:00:00Z',
      },
    ];

    for (const tf of transferRecords) {
      await queryRunner.query(
        `INSERT INTO "transfers" (
          id, from_account_id, to_account_id, created_by, fee,
          from_amount, from_currency, to_amount, to_currency, exchange_rate, note, transfer_date
         ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11
         )`,
        [
          tf.fromAcc, tf.toAcc, adminId, tf.fee,
          tf.fromAmt, tf.fromCur, tf.toAmt, tf.toCur, tf.rate, tf.note, tf.date,
        ],
      );
    }
    console.log(` ✅ Đã tạo ${transferRecords.length} bản ghi chuyển tiền nội bộ & quy đổi ngoại tệ (VND -> USD).`);

    // -------------------------------------------------------------------------
    // BƯỚC 8: KHỞI TẠO HẠN MỨC NGÂN SÁCH (BUDGETS) THÁNG 11/2026
    // -------------------------------------------------------------------------
    console.log('\n[8/16] Khởi tạo ngân sách định kỳ tháng 11/2026...');
    const budgetsData = [
      { catId: catFoodId, limit: 7000000, spent: 4200000 },
      { catId: catUtilityId, limit: 12000000, spent: 10500000 },
      { catId: catShoppingId, limit: 5000000, spent: 3100000 },
      { catId: catTransportId, limit: 2000000, spent: 1200000 },
      { catId: catEntId, limit: 3000000, spent: 1800000 },
    ];

    for (const b of budgetsData) {
      const budgetRes = await queryRunner.query(
        `INSERT INTO "budgets" (id, wallet_id, category_id, limit_amount, period, start_date, is_rollover)
         VALUES (uuid_generate_v4(), $1, $2, $3, 'monthly', '2026-11-01', true)
         RETURNING id`,
        [wallet1Id, b.catId, b.limit],
      );

      const bId = budgetRes[0].id;
      await queryRunner.query(
        `INSERT INTO "budget_periods" (id, budget_id, start_date, end_date, limit_amount, spent_amount, rollover_amount, warning_alert_sent, exceeded_alert_sent)
         VALUES (uuid_generate_v4(), $1, '2026-11-01', '2026-11-30', $2, $3, 0, false, false)`,
        [bId, b.limit, b.spent],
      );
    }
    console.log(` ✅ Đã tạo 5 hạn mức ngân sách tháng 11/2026 kèm tiến độ chi tiêu thực tế.`);

    // -------------------------------------------------------------------------
    // BƯỚC 9: KHỞI TẠO KHOẢN VAY / CHO VAY (LOANS & PAYMENTS)
    // -------------------------------------------------------------------------
    console.log('\n[9/16] Khởi tạo khoản cho vay & đi vay kèm lịch sử hoàn ứng...');
    // Khoản 1: Cho Hoàng Văn Minh vay 12M, Minh đã trả 4M, còn lại 8M
    const loan1Res = await queryRunner.query(
      `INSERT INTO "loans" (
        id, wallet_id, account_id, created_by, counterparty_user_id, type, contact_name,
        contact_info, principal_amount, remaining_amount, currency, note, loan_date, due_date, status
       ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'LENT', 'Hoàng Văn Minh',
        '0988776655', 12000000.00, 8000000.00, 'VND', 'Cho Minh mượn làm đồ án tốt nghiệp và nâng cấp máy tính',
        '2026-09-10T10:00:00Z', '2026-12-31T10:00:00Z', 'ACTIVE'
       ) RETURNING id`,
      [wallet1Id, accVcbId, adminId, friendUsers[0].id],
    );
    const loan1Id = loan1Res[0].id;

    await queryRunner.query(
      `INSERT INTO "loan_payments" (id, loan_id, account_id, amount, note, payment_date)
       VALUES (uuid_generate_v4(), $1, $2, 4000000.00, 'Minh chuyển khoản trả đợt 1 qua VCB', '2026-10-15T15:00:00Z')`,
      [loan1Id, accVcbId],
    );

    // Khoản 2: Vay Techcombank 20M trả góp mua thiết bị, đã trả 10M, còn 10M
    const loan2Res = await queryRunner.query(
      `INSERT INTO "loans" (
        id, wallet_id, account_id, created_by, counterparty_user_id, type, contact_name,
        contact_info, principal_amount, remaining_amount, currency, note, loan_date, due_date, status
       ) VALUES (
        uuid_generate_v4(), $1, $2, $3, NULL, 'BORROWED', 'Techcombank Consumer Loan',
        'Hotline 1800588822', 20000000.00, 10000000.00, 'VND', 'Vay trả góp mua thiết bị công nghệ làm việc',
        '2026-08-15T09:00:00Z', '2026-12-15T09:00:00Z', 'ACTIVE'
       ) RETURNING id`,
      [wallet1Id, accTcbId, adminId],
    );
    const loan2Id = loan2Res[0].id;

    await queryRunner.query(
      `INSERT INTO "loan_payments" (id, loan_id, account_id, amount, note, payment_date)
       VALUES 
       (uuid_generate_v4(), $1, $2, 5000000.00, 'Thanh toán trả góp kỳ tháng 9/2026', '2026-09-20T10:00:00Z'),
       (uuid_generate_v4(), $1, $2, 5000000.00, 'Thanh toán trả góp kỳ tháng 10/2026', '2026-10-20T10:00:00Z')`,
      [loan2Id, accTcbId],
    );
    console.log(` ✅ Đã tạo 2 khoản Loan (Cho bạn vay 12M + Vay tiêu dùng 20M) và các lượt thanh toán LoanPayment.`);

    // -------------------------------------------------------------------------
    // BƯỚC 10: KHỞI TẠO CHIA TIỀN NHÓM (SPLIT EXPENSES)
    // -------------------------------------------------------------------------
    console.log('\n[10/16] Khởi tạo các sự kiện chia tiền nhóm (Split Expenses)...');
    // Sự kiện 1: Tiệc BBQ 1.2M (Admin, Minh, Lan Anh)
    if (splitBbqTxId) {
      const split1Res = await queryRunner.query(
        `INSERT INTO "expense_splits" (id, transaction_id, wallet_id, created_by_id, total_amount, split_type, status)
         VALUES (uuid_generate_v4(), $1, $2, $3, 1200000.00, 'equal', 'pending')
         RETURNING id`,
        [splitBbqTxId, wallet1Id, adminId],
      );
      const split1Id = split1Res[0].id;

      await queryRunner.query(
        `INSERT INTO "split_participants" (id, split_id, user_id, assigned_amount, status, note, is_settled)
         VALUES 
         (uuid_generate_v4(), $1, $2, 400000.00, 'accepted', 'Admin chi trả chính', true),
         (uuid_generate_v4(), $1, $3, 400000.00, 'accepted', 'Minh đã chuyển trả qua MoMo', true),
         (uuid_generate_v4(), $1, $4, 400000.00, 'pending', 'Chờ Lan Anh chuyển khoản 400.000 VND', false)`,
        [split1Id, adminId, friendUsers[0].id, friendUsers[1].id],
      );
    }

    // Sự kiện 2: Dã ngoại Ba Vì 1.5M (Admin, Minh, Bảo)
    if (splitCampingTxId) {
      const split2Res = await queryRunner.query(
        `INSERT INTO "expense_splits" (id, transaction_id, wallet_id, created_by_id, total_amount, split_type, status)
         VALUES (uuid_generate_v4(), $1, $2, $3, 1500000.00, 'equal', 'pending')
         RETURNING id`,
        [splitCampingTxId, wallet1Id, adminId],
      );
      const split2Id = split2Res[0].id;

      await queryRunner.query(
        `INSERT INTO "split_participants" (id, split_id, user_id, assigned_amount, status, note, is_settled)
         VALUES 
         (uuid_generate_v4(), $1, $2, 500000.00, 'accepted', 'Admin chi trả', true),
         (uuid_generate_v4(), $1, $3, 500000.00, 'pending', 'Chờ Minh xác nhận', false),
         (uuid_generate_v4(), $1, $4, 500000.00, 'accepted', 'Bảo đã thanh toán lại tiền mặt', true)`,
        [split2Id, adminId, friendUsers[0].id, friendUsers[2].id],
      );
    }
    console.log(` ✅ Đã thiết lập 2 sự kiện chia tiền nhóm (Tiệc BBQ & Dã ngoại Ba Vì).`);

    // -------------------------------------------------------------------------
    // BƯỚC 11: KHỞI TẠO LỊCH GIAO DỊCH ĐỊNH KỲ (RECURRING TRANSACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[11/16] Khởi tạo các giao dịch định kỳ (Recurring Transactions)...');
    const recurringList = [
      {
        name: 'Lương chuyển khoản công ty',
        accId: accVcbId, catId: catSalaryId,
        type: 'INCOME', amount: 38000000,
        freq: 'MONTHLY',
        start: '2026-09-01T00:00:00Z',
        next: '2026-12-05T09:00:00Z',
      },
      {
        name: 'Tiền thuê căn hộ hàng tháng',
        accId: accVcbId, catId: catHousingId,
        type: 'EXPENSE', amount: 8500000,
        freq: 'MONTHLY',
        start: '2026-09-01T00:00:00Z',
        next: '2026-12-01T10:00:00Z',
      },
      {
        name: 'Gói xem phim Netflix Premium',
        accId: accMomoId, catId: catEntId,
        type: 'EXPENSE', amount: 260000,
        freq: 'MONTHLY',
        start: '2026-09-15T00:00:00Z',
        next: '2026-12-15T02:00:00Z',
      },
    ];

    for (const rec of recurringList) {
      await queryRunner.query(
        `INSERT INTO "recurring_transactions" (
          id, wallet_id, account_id, category_id, created_by,
          name, amount, currency, type, frequency, start_date, next_run_date, is_paused
         ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4,
          $5, $6, 'VND', $7, $8, $9, $10, false
         )`,
        [
          wallet1Id, rec.accId, rec.catId, adminId,
          rec.name, rec.amount, rec.type, rec.freq, rec.start, rec.next,
        ],
      );
    }
    console.log(` ✅ Đã tạo ${recurringList.length} lịch giao dịch định kỳ (Lương, Tiền nhà, Netflix).`);

    // -------------------------------------------------------------------------
    // BƯỚC 12: KHỞI TẠO TIN NHẮN AI CHAT & HÀNH ĐỘNG CHỜ PHÊ DUYỆT (PENDING ACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[12/16] Khởi tạo lịch sử đối thoại với AI Mascot Jade và Pending Action...');
    const chatMessages = [
      {
        role: 'USER', type: 'TEXT',
        text: 'Chào Jade! Tình hình tài chính tháng 11 của tôi hiện tại như thế nào?',
        intent: 'financial_summary', mascot: 'jade', payload: null,
      },
      {
        role: 'ASSISTANT', type: 'TEXT',
        text: 'Xin chào! Tôi là Jade, người đồng hành tài chính của bạn. Hiện tại tổng tài sản ròng khả dụng của bạn đạt 180,725,000 VND (bao gồm tài khoản USD quy đổi và các khoản cho vay). Bạn đang duy trì phong độ tài chính vững chắc và thuộc phân hạng Linh Vật Jade (Ngọc Bích)!',
        intent: 'financial_summary', mascot: 'jade',
        payload: {
          net_worth: 180725000,
          tier: 'jade',
          total_income_this_month: 46500000,
          total_expense_this_month: 21545000,
        },
      },
      {
        role: 'USER', type: 'TEXT',
        text: 'Tôi vừa quét hóa đơn ăn đêm cơm tấm Bà Rọi 85.000đ trả bằng tiền mặt lúc nãy.',
        intent: 'create_transaction', mascot: 'jade', payload: null,
      },
      {
        role: 'ASSISTANT', type: 'CONFIRMATION_PROMPT',
        text: 'Tôi đã trích xuất từ hóa đơn: Ăn cơm tấm đêm Bà Rọi - 85,000 VND (Danh mục: Ăn uống & Cà phê, Nguồn tiền: Tiền Mặt Sẵn Có). Bạn có muốn tôi ghi nhận vào sổ thu chi ngay không?',
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
          date: '2026-11-26',
          prompt: 'Xác nhận tạo giao dịch 85,000 VND?',
        }),
      ],
    );
    console.log(` ✅ Đã khởi tạo 4 tin nhắn AI Chat và 1 PendingAction chờ duyệt.`);

    // -------------------------------------------------------------------------
    // BƯỚC 13: KHỞI TẠO TIN NHẮN TRỰC TIẾP GIỮA BẠN BÈ (DIRECT MESSAGES & REACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[13/16] Khởi tạo tin nhắn trực tiếp bạn bè (Direct Messages)...');
    const dmRows = [
      {
        sender: friendUsers[0].id, receiver: adminId,
        content: 'Anh ơi, em vừa chuyển 4 triệu tiền trả đợt 1 rồi nha anh, cảm ơn anh nhiều!',
        isRead: true,
      },
      {
        sender: adminId, receiver: friendUsers[0].id,
        content: 'Anh nhận được rồi nhé Minh, cứ lo hoàn thiện nốt đồ án đi nhé em.',
        isRead: true,
      },
      {
        sender: friendUsers[1].id, receiver: adminId,
        content: 'Hôm tiệc BBQ vui quá, để tối nay mình ck lại 400k cho bạn nha!',
        isRead: false,
      },
    ];

    let firstMsgId = '';
    for (let i = 0; i < dmRows.length; i++) {
      const dm = dmRows[i];
      const inserted = await queryRunner.query(
        `INSERT INTO "direct_messages" (
          id, sender_id, receiver_id, type, content, is_read, read_at
         ) VALUES (
          uuid_generate_v4(), $1, $2, 'TEXT', $3, $4, $5
         ) RETURNING id`,
        [dm.sender, dm.receiver, dm.content, dm.isRead, dm.isRead ? new Date() : null],
      );
      if (i === 0) firstMsgId = inserted[0].id;
    }

    if (firstMsgId) {
      await queryRunner.query(
        `INSERT INTO "message_reactions" (id, message_id, user_id, emoji)
         VALUES (uuid_generate_v4(), $1, $2, 'love')`,
        [firstMsgId, adminId],
      );
    }
    console.log(` ✅ Đã tạo 3 tin nhắn DirectMessage kèm phản ứng tim (reaction).`);

    // -------------------------------------------------------------------------
    // BƯỚC 14: KHỞI TẠO TƯƠNG TÁC BẢNG TIN BẠN BÈ (POST REACTIONS)
    // -------------------------------------------------------------------------
    console.log('\n[14/16] Khởi tạo tương tác reaction bài đăng (Post Reactions)...');
    if (publicFeedTxId) {
      // Bạn bè thả reaction lên bài đăng Dã ngoại Ba Vì
      await queryRunner.query(
        `INSERT INTO "post_reactions" (id, transaction_id, user_id, emoji)
         VALUES 
         (uuid_generate_v4(), $1, $2, 'love'),
         (uuid_generate_v4(), $1, $3, 'like'),
         (uuid_generate_v4(), $1, $4, 'clap')
         ON CONFLICT (transaction_id, user_id) DO NOTHING`,
        [publicFeedTxId, friendUsers[0].id, friendUsers[1].id, friendUsers[2].id],
      );
      console.log(` ✅ Đã tạo 3 reactions (love, like, clap) từ bạn bè trên bài đăng Feed.`);
    }

    // -------------------------------------------------------------------------
    // BƯỚC 15: TẠO THÔNG BÁO HỆ THỐNG MẪU (NOTIFICATIONS)
    // -------------------------------------------------------------------------
    console.log('\n[15/16] Khởi tạo 5 thông báo hệ thống dành cho Admin...');
    const sampleNotifications = [
      {
        type: 'ASSET_TIER_UP',
        title: 'Chúc mừng thăng hạng Linh Vật!',
        body: 'Tổng tài sản ròng của bạn đã vượt mốc 100,000,000 VND. Bạn đã vinh dự đạt cấp độ Linh Vật Jade (Ngọc Bích)!',
        isRead: false,
      },
      {
        type: 'BUDGET_WARNING',
        title: 'Cảnh báo hạn mức ngân sách Hóa đơn & Tiện ích',
        body: 'Ngân sách Hóa đơn tháng 11 đã đạt 87.5% (10,500,000 / 12,000,000 VND). Hãy cân đối các chi tiêu còn lại.',
        isRead: false,
      },
      {
        type: 'LOAN_PAYMENT_RECEIVED',
        title: 'Nhận tiền hoàn ứng khoản vay',
        body: 'Hoàng Văn Minh đã chuyển khoản thanh toán 4,000,000 VND cho khoản vay đồ án.',
        isRead: true,
      },
      {
        type: 'SPLIT_REQUEST',
        title: 'Yêu cầu chia tiền Dã ngoại Ba Vì',
        body: 'Yêu cầu chia tiền dã ngoại (500,000 VND/người) đã được gửi tới Minh và Bảo.',
        isRead: true,
      },
      {
        type: 'RECURRING_EXECUTED',
        title: 'Giao dịch định kỳ đã thực hiện',
        body: 'Giao dịch "Tiền thuê căn hộ hàng tháng" (8,500,000 VND) đã được tự động xử lý thành công.',
        isRead: false,
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

    // -------------------------------------------------------------------------
    // BƯỚC 16: KHỞI TẠO NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
    // -------------------------------------------------------------------------
    console.log('\n[16/16] Khởi tạo nhật ký kiểm toán (Audit Logs)...');
    const auditLogs = [
      {
        action: 'CREATE_WALLET',
        entityType: 'Wallet',
        entityId: wallet1Id,
        walletId: wallet1Id,
        ip: '127.0.0.1',
        newVal: { name: 'Ví Chi Tiêu Cá Nhân', type: 'PERSONAL', currency: 'VND' },
      },
      {
        action: 'CREATE_ACCOUNT',
        entityType: 'Account',
        entityId: accVcbId,
        walletId: wallet1Id,
        ip: '127.0.0.1',
        newVal: { name: 'Vietcombank DigiBank', balance: 55000000, currency: 'VND' },
      },
      {
        action: 'CREATE_TRANSFER',
        entityType: 'Transfer',
        entityId: null,
        walletId: wallet1Id,
        ip: '127.0.0.1',
        newVal: { fromAmount: 12725000, toAmount: 500, fromCurrency: 'VND', toCurrency: 'USD' },
      },
      {
        action: 'CREATE_LOAN',
        entityType: 'Loan',
        entityId: loan1Id,
        walletId: wallet1Id,
        ip: '127.0.0.1',
        newVal: { principalAmount: 12000000, contactName: 'Hoàng Văn Minh', type: 'LENT' },
      },
      {
        action: 'ADJUST_BUDGET',
        entityType: 'Budget',
        entityId: null,
        walletId: wallet1Id,
        ip: '127.0.0.1',
        newVal: { category: 'Ăn uống & Cà phê', limitAmount: 7000000, period: 'monthly' },
      },
    ];

    for (const log of auditLogs) {
      await queryRunner.query(
        `INSERT INTO "audit_logs" (
          id, user_id, wallet_id, action, entity_type, entity_id, ip_address, user_agent, new_value
         ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 'Finora-Backend/Seed-Runner', $7
         )`,
        [
          adminId, log.walletId, log.action, log.entityType, log.entityId, log.ip,
          JSON.stringify(log.newVal),
        ],
      );
    }
    console.log(` ✅ Đã tạo ${auditLogs.length} bản ghi kiểm toán trong audit_logs.`);

    // Commit Transaction
    await queryRunner.commitTransaction();

    console.log('\n========================================================');
    console.log('🎉 MIGRATE VÀ SEED DỮ LIỆU TOÀN DIỆN THÀNH CÔNG 100%! 🎉');
    console.log(`   Admin Email: admin@finora.com (ID: ${adminId})`);
    console.log(`   Tài khoản: 5 tài khoản (Tiền mặt, VCB, TCB, MoMo, USD)`);
    console.log(`   Tổng tài sản ròng kế toán: 180,725,000 VND -> Linh vật: Jade`);
    console.log(`   Giao dịch: 43 giao dịch đa kênh (Tháng 9, 10, 11/2026)`);
    console.log(`   Chuyển tiền & Ngoại tệ: 4 giao dịch (ATM, MoMo, Mua $500 USD)`);
    console.log(`   Ngân sách: 5 danh mục tháng 11/2026`);
    console.log(`   Khoản vay: 2 khoản (Cho Minh vay 12M, Vay TCB 20M) + Lịch sử trả`);
    console.log(`   Chia sẻ: Tiệc BBQ & Dã ngoại Ba Vì (3 người)`);
    console.log(`   Giao dịch định kỳ: 3 lịch trình (Lương, Nhà, Netflix)`);
    console.log(`   AI Chat: 4 tin nhắn + 1 Pending Action`);
    console.log(`   Tin nhắn bạn bè: 3 tin nhắn DirectMessage + 1 Reaction`);
    console.log(`   Tương tác Feed: 3 post reactions trên giao dịch cộng đồng`);
    console.log(`   Thông báo: 5 thông báo hệ thống`);
    console.log(`   Nhật ký: 5 bản ghi kiểm toán audit_logs`);
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
