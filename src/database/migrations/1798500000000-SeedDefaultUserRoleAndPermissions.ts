import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultUserRoleAndPermissions1798500000000
  implements MigrationInterface
{
  name = 'SeedDefaultUserRoleAndPermissions1798500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Đảm bảo Role 'USER' tồn tại trong bảng roles
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "code", "name", "description", "is_active", "is_sys_admin")
      VALUES (
        uuid_generate_v4(),
        'USER',
        'Người dùng thông thường',
        'Người dùng tiêu chuẩn với quyền thao tác tài chính cá nhân và nhóm',
        true,
        false
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "is_active" = true;
    `);

    // 2. Đảm bảo đầy đủ Permissions trong bảng permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        -- Wallets
        ('WALLETS_CREATE', 'Tạo ví', 'wallets', 'create', 'Tạo ví tài chính mới'),
        ('WALLETS_READ', 'Xem thông tin ví', 'wallets', 'read', 'Xem danh sách và chi tiết ví'),
        ('WALLETS_UPDATE', 'Cập nhật ví', 'wallets', 'update', 'Cập nhật thông tin ví'),
        ('WALLETS_DELETE', 'Xóa ví', 'wallets', 'delete', 'Giải tán hoặc xóa ví'),
        ('WALLETS_TRANSFER_OWNERSHIP', 'Chuyển nhượng quyền ví', 'wallets', 'transfer_ownership', 'Chuyển nhượng quyền sở hữu ví'),
        ('WALLETS_MEMBER_INVITE', 'Mời thành viên ví', 'wallets', 'invite_member', 'Mời thành viên vào ví'),
        ('WALLETS_MEMBER_ASSIGN_ROLE', 'Gán vai trò thành viên ví', 'wallets', 'assign_member_role', 'Thay đổi vai trò thành viên ví'),
        ('WALLETS_MEMBER_KICK', 'Xóa thành viên khỏi ví', 'wallets', 'kick_member', 'Mời thành viên ra khỏi ví'),

        -- Accounts
        ('ACCOUNTS_CREATE', 'Tạo tài khoản', 'accounts', 'create', 'Tạo tài khoản hoặc sổ phụ trong ví'),
        ('ACCOUNTS_READ', 'Xem tài khoản', 'accounts', 'read', 'Xem danh sách và số dư tài khoản'),
        ('ACCOUNTS_UPDATE', 'Cập nhật tài khoản', 'accounts', 'update', 'Cập nhật thông tin tài khoản'),
        ('ACCOUNTS_DELETE', 'Xóa tài khoản', 'accounts', 'delete', 'Xóa hoặc đóng tài khoản'),
        ('ACCOUNTS_ADJUST_BALANCE', 'Điều chỉnh số dư', 'accounts', 'adjust_balance', 'Điều chỉnh số dư tài khoản'),

        -- Transactions
        ('TRANSACTIONS_CREATE', 'Tạo giao dịch', 'transactions', 'create', 'Ghi nhận giao dịch thu chi mới'),
        ('TRANSACTIONS_READ', 'Xem giao dịch', 'transactions', 'read', 'Xem lịch sử và chi tiết giao dịch'),
        ('TRANSACTIONS_UPDATE', 'Cập nhật giao dịch', 'transactions', 'update', 'Chỉnh sửa giao dịch đã tạo'),
        ('TRANSACTIONS_DELETE', 'Xóa giao dịch', 'transactions', 'delete', 'Xóa giao dịch'),

        -- Transfers
        ('TRANSFERS_CREATE', 'Chuyển tiền', 'transfers', 'create', 'Thực hiện chuyển tiền giữa các tài khoản'),
        ('TRANSFERS_READ', 'Xem chuyển tiền', 'transfers', 'read', 'Xem lịch sử chuyển tiền'),

        -- Budgets
        ('BUDGETS_CREATE', 'Tạo ngân sách', 'budgets', 'create', 'Tạo hạn mức ngân sách chi tiêu'),
        ('BUDGETS_READ', 'Xem ngân sách', 'budgets', 'read', 'Xem tiến độ và báo cáo ngân sách'),
        ('BUDGETS_UPDATE', 'Cập nhật ngân sách', 'budgets', 'update', 'Điều chỉnh hạn mức ngân sách'),
        ('BUDGETS_DELETE', 'Xóa ngân sách', 'budgets', 'delete', 'Hủy hoặc xóa ngân sách'),

        -- Feed
        ('FEED_READ', 'Xem bảng tin', 'feed', 'read', 'Xem bảng tin tài chính cộng đồng'),
        ('FEED_REACT', 'Tương tác bảng tin', 'feed', 'react', 'Thả cảm xúc trên bảng tin'),
        ('FEED_UPDATE', 'Cập nhật bảng tin', 'feed', 'update', 'Chỉnh sửa bài đăng trên bảng tin'),

        -- Exchange Rates
        ('EXCHANGE_RATES_READ', 'Xem tỷ giá', 'exchange_rates', 'read', 'Tra cứu tỷ giá hối đoái tiền tệ'),

        -- Audit Logs (Cá nhân)
        ('AUDIT_LOGS_READ', 'Xem nhật ký cá nhân', 'audit_logs', 'read', 'Xem nhật ký hoạt động của tài khoản'),
        ('AUDIT_LOGS_EXPORT', 'Xuất nhật ký cá nhân', 'audit_logs', 'export', 'Xuất file nhật ký hoạt động cá nhân'),

        -- Split Expenses
        ('SPLIT_EXPENSES_CREATE', 'Tạo chia tiền', 'split_expenses', 'create', 'Tạo sự kiện chia tiền nhóm'),
        ('SPLIT_EXPENSES_READ', 'Xem chia tiền', 'split_expenses', 'read', 'Xem chi tiết chia tiền nhóm'),
        ('SPLIT_EXPENSES_UPDATE', 'Cập nhật chia tiền', 'split_expenses', 'update', 'Cập nhật chia tiền nhóm'),
        ('SPLIT_EXPENSES_DELETE', 'Xóa chia tiền', 'split_expenses', 'delete', 'Hủy sự kiện chia tiền nhóm'),

        -- Messages
        ('MESSAGES_CREATE', 'Gửi tin nhắn', 'messages', 'create', 'Gửi tin nhắn trong ví hoặc Nora AI'),
        ('MESSAGES_READ', 'Xem tin nhắn', 'messages', 'read', 'Đọc tin nhắn trong ví hoặc Nora AI'),
        ('MESSAGES_UPDATE', 'Sửa tin nhắn', 'messages', 'update', 'Chỉnh sửa tin nhắn'),
        ('MESSAGES_DELETE', 'Xóa tin nhắn', 'messages', 'delete', 'Xóa tin nhắn'),

        -- Loans
        ('LOANS_CREATE', 'Tạo khoản vay', 'loans', 'create', 'Ghi chép khoản vay hoặc cho vay'),
        ('LOANS_READ', 'Xem khoản vay', 'loans', 'read', 'Xem danh sách khoản vay và tiến độ trả nợ'),
        ('LOANS_UPDATE', 'Cập nhật khoản vay', 'loans', 'update', 'Cập nhật hoặc thanh toán khoản vay'),
        ('LOANS_DELETE', 'Xóa khoản vay', 'loans', 'delete', 'Xóa khoản vay nợ'),

        -- Mascots
        ('MASCOTS_READ', 'Xem linh vật', 'mascots', 'read', 'Xem thông tin và cấp độ linh vật Nora AI')
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 3. Cấp toàn bộ các quyền người dùng trên cho vai trò 'USER'
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'USER' AND p.code IN (
        -- Wallets
        'WALLETS_CREATE', 'WALLETS_READ', 'WALLETS_UPDATE', 'WALLETS_DELETE',
        'WALLETS_TRANSFER_OWNERSHIP', 'WALLETS_MEMBER_INVITE', 'WALLETS_MEMBER_ASSIGN_ROLE', 'WALLETS_MEMBER_KICK',
        -- Accounts
        'ACCOUNTS_CREATE', 'ACCOUNTS_READ', 'ACCOUNTS_UPDATE', 'ACCOUNTS_DELETE', 'ACCOUNTS_ADJUST_BALANCE',
        -- Transactions
        'TRANSACTIONS_CREATE', 'TRANSACTIONS_READ', 'TRANSACTIONS_UPDATE', 'TRANSACTIONS_DELETE',
        -- Transfers
        'TRANSFERS_CREATE', 'TRANSFERS_READ',
        -- Budgets
        'BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE',
        -- Feed
        'FEED_READ', 'FEED_REACT', 'FEED_UPDATE',
        -- Exchange Rates
        'EXCHANGE_RATES_READ',
        -- Audit Logs
        'AUDIT_LOGS_READ', 'AUDIT_LOGS_EXPORT',
        -- Split Expenses
        'SPLIT_EXPENSES_CREATE', 'SPLIT_EXPENSES_READ', 'SPLIT_EXPENSES_UPDATE', 'SPLIT_EXPENSES_DELETE',
        -- Messages
        'MESSAGES_CREATE', 'MESSAGES_READ', 'MESSAGES_UPDATE', 'MESSAGES_DELETE',
        -- Loans
        'LOANS_CREATE', 'LOANS_READ', 'LOANS_UPDATE', 'LOANS_DELETE',
        -- Mascots
        'MASCOTS_READ'
      )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // 4. Cấp toàn bộ permissions trong hệ thống cho role 'ADMIN'
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'ADMIN'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // 5. Gán vai trò 'USER' cho tất cả người dùng hiện tại đang chưa có vai trò nào
    await queryRunner.query(`
      INSERT INTO "user_roles" ("id", "user_id", "role_id")
      SELECT uuid_generate_v4(), u.id, r.id
      FROM "users" u
      CROSS JOIN "roles" r
      WHERE r.code = 'USER'
        AND NOT EXISTS (
          SELECT 1 FROM "user_roles" ur WHERE ur.user_id = u.id
        )
      ON CONFLICT ("user_id", "role_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE role_id IN (SELECT id FROM "roles" WHERE code = 'USER');
    `);
  }
}

