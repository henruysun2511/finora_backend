import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFriendPostForAdminTest1799100000000 implements MigrationInterface {
  name = 'SeedFriendPostForAdminTest1799100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Lấy thông tin Admin
    const adminRows = await queryRunner.query(
      `SELECT id FROM "users" WHERE email = 'admin@finora.com' LIMIT 1`,
    );

    let adminId = '411ae0e4-8bf7-47b4-ae29-e0e7393e3b44';
    if (adminRows.length > 0) {
      adminId = adminRows[0].id;
    }

    const friendId = 'b1111111-1111-4111-a111-111111111111';
    const friendEmail = 'minh.hoang@finora.internal';
    const friendUsername = 'minhhoang';
    const friendFullName = 'Hoàng Văn Minh';
    const friendAvatar =
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

    // 2. Đảm bảo User bạn bè tồn tại
    await queryRunner.query(
      `INSERT INTO "users" (id, username, email, password, full_name, avatar, auth_provider, status, is_active)
       VALUES ($1, $2, $3, '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO', $4, $5, 'LOCAL', 'ACTIVE', true)
       ON CONFLICT (email) DO UPDATE SET 
         full_name = EXCLUDED.full_name,
         avatar = EXCLUDED.avatar,
         is_active = true`,
      [friendId, friendUsername, friendEmail, friendFullName, friendAvatar],
    );

    // 3. Đảm bảo mối quan hệ bạn bè ACCEPTED giữa Admin và Hoàng Văn Minh
    const existingFriendship = await queryRunner.query(
      `SELECT id FROM "friendships" 
       WHERE (requester_id = $1 AND addressee_id = $2) 
          OR (requester_id = $2 AND addressee_id = $1) LIMIT 1`,
      [adminId, friendId],
    );

    if (existingFriendship.length > 0) {
      await queryRunner.query(
        `UPDATE "friendships" SET status = 'ACCEPTED', deleted_at = NULL WHERE id = $1`,
        [existingFriendship[0].id],
      );
    } else {
      await queryRunner.query(
        `INSERT INTO "friendships" (id, requester_id, addressee_id, status, responded_at)
         VALUES (uuid_generate_v4(), $1, $2, 'ACCEPTED', now())`,
        [adminId, friendId],
      );
    }

    // 4. Tạo Ví (Wallet) cho người bạn
    const walletId = 'c1111111-1111-4111-a111-111111111111';
    await queryRunner.query(
      `INSERT INTO "wallets" (id, name, default_currency, owner_id, is_active, is_shared)
       VALUES ($1, 'Ví chi tiêu hàng ngày Minh', 'VND', $2, true, false)
       ON CONFLICT (id) DO UPDATE SET is_active = true`,
      [walletId, friendId],
    );

    // 5. Tạo Tài khoản ngân hàng (Account) cho người bạn
    const accountId = 'd1111111-1111-4111-a111-111111111111';
    await queryRunner.query(
      `INSERT INTO "accounts" (id, name, type, currency, balance, wallet_id, created_by, is_archived)
       VALUES ($1, 'Techcombank Chi Tiêu', 'BANK_ACCOUNT', 'VND', 15000000, $2, $3, false)
       ON CONFLICT (id) DO UPDATE SET is_archived = false`,
      [accountId, walletId, friendId],
    );

    // 6. Tìm hoặc tạo Danh mục (Category)
    let categoryRows = await queryRunner.query(
      `SELECT id FROM "categories" WHERE name = 'Cà phê & Đồ uống' LIMIT 1`,
    );
    let categoryId: string;
    if (categoryRows.length > 0) {
      categoryId = categoryRows[0].id;
    } else {
      categoryRows = await queryRunner.query(
        `SELECT id FROM "categories" WHERE type = 'EXPENSE' LIMIT 1`,
      );
      if (categoryRows.length > 0) {
        categoryId = categoryRows[0].id;
      } else {
        categoryId = 'f1111111-1111-4111-a111-111111111111';
        await queryRunner.query(
          `INSERT INTO "categories" (id, name, type, icon, color, is_default)
           VALUES ($1, 'Ăn uống & Cà phê', 'EXPENSE', 'coffee', '#0072D6', true)
           ON CONFLICT (id) DO NOTHING`,
          [categoryId],
        );
      }
    }

    // 7. Tạo Bài đăng giao dịch (Transaction) của người bạn Minh với chế độ FRIENDS và có ảnh
    const txId = 'e1111111-1111-4111-a111-111111111111';
    await queryRunner.query(
      `INSERT INTO "transactions" (
         id, account_id, created_by, category_id, type, amount, currency,
         name, note, source, status, visibility, amount_hidden,
         photo_url, photo_type, location_name, transaction_date
       )
       VALUES (
         $1, $2, $3, $4, 'EXPENSE', 65000, 'VND',
         'Cà phê chiều cuối tuần cùng bạn bè ☕🍰',
         'Trời thu Hà Nội mát mẻ, ghé quán quen làm ly latte và bánh croissant chill chill!',
         'MANUAL', 'CONFIRMED', 'FRIENDS', false,
         'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
         'MOMENT', 'The Coffee House - Hà Nội', now()
       )
       ON CONFLICT (id) DO UPDATE SET 
         visibility = 'FRIENDS',
         photo_url = EXCLUDED.photo_url,
         photo_type = 'MOMENT',
         amount = 65000,
         name = EXCLUDED.name,
         note = EXCLUDED.note,
         created_by = $3,
         transaction_date = now()`,
      [txId, accountId, friendId, categoryId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "transactions" WHERE id = 'e1111111-1111-4111-a111-111111111111'`,
    );
    await queryRunner.query(
      `DELETE FROM "accounts" WHERE id = 'd1111111-1111-4111-a111-111111111111'`,
    );
    await queryRunner.query(
      `DELETE FROM "wallets" WHERE id = 'c1111111-1111-4111-a111-111111111111'`,
    );
  }
}
