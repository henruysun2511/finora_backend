import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAdminUser1798300000000 implements MigrationInterface {
  name = 'SeedAdminUser1798300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Đảm bảo Role 'ADMIN' tồn tại với cờ is_sys_admin = true
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "code", "name", "description", "is_active", "is_sys_admin")
      VALUES (uuid_generate_v4(), 'ADMIN', 'Quản trị viên', 'Toàn quyền quản trị hệ thống', true, true)
      ON CONFLICT ("code") DO UPDATE SET "is_sys_admin" = true;
    `);

    // 2. Tạo tài khoản Admin (Email: admin@finora.com, Username: admin, Mật khẩu: Admin@123456)
    // Hash bcrypt (10 rounds): $2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO
    await queryRunner.query(`
      INSERT INTO "users" (
        "id",
        "username",
        "email",
        "password",
        "full_name",
        "auth_provider",
        "status",
        "is_active"
      )
      VALUES (
        uuid_generate_v4(),
        'admin',
        'admin@finora.com',
        '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO',
        'Quản trị viên hệ thống',
        'LOCAL',
        'ACTIVE',
        true
      )
      ON CONFLICT ("email") DO UPDATE SET
        "username" = 'admin',
        "password" = '$2b$10$4jWae4XgMXbe9jlGODcbJO8suz3FMnd2nx3szvF0O8dbRw/dwgoIO',
        "full_name" = 'Quản trị viên hệ thống',
        "status" = 'ACTIVE',
        "is_active" = true;
    `);

    // 3. Gán Role 'ADMIN' cho tài khoản vừa tạo trong user_roles
    await queryRunner.query(`
      INSERT INTO "user_roles" ("id", "user_id", "role_id")
      SELECT uuid_generate_v4(), u.id, r.id
      FROM "users" u
      CROSS JOIN "roles" r
      WHERE u.email = 'admin@finora.com' AND r.code = 'ADMIN'
      ON CONFLICT ("user_id", "role_id") DO NOTHING;
    `);

    // 4. Khởi tạo cấu hình mặc định trong user_settings
    await queryRunner.query(`
      INSERT INTO "user_settings" (
        "id",
        "user_id",
        "default_currency",
        "language",
        "theme",
        "app_lock_enabled",
        "require_pin_for_transactions",
        "show_mascot",
        "mascot_tone",
        "mascot_sensitivity"
      )
      SELECT
        uuid_generate_v4(),
        u.id,
        'VND',
        'vi',
        'SYSTEM',
        false,
        false,
        true,
        'BALANCED',
        'ANOMALIES_ONLY'
      FROM "users" u
      WHERE u.email = 'admin@finora.com'
      ON CONFLICT ("user_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "user_roles"
      WHERE user_id IN (SELECT id FROM "users" WHERE email = 'admin@finora.com');
    `);

    await queryRunner.query(`
      DELETE FROM "user_settings"
      WHERE user_id IN (SELECT id FROM "users" WHERE email = 'admin@finora.com');
    `);

    await queryRunner.query(`
      DELETE FROM "users"
      WHERE email = 'admin@finora.com';
    `);
  }
}
