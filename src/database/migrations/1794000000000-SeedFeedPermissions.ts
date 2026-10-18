import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFeedPermissions1794000000000 implements MigrationInterface {
  name = 'SeedFeedPermissions1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('FEED_READ', 'Xem bảng tin', 'feed', 'read', 'Xem bảng tin bài đăng của bạn bè và danh sách cảm xúc'),
        ('FEED_REACT', 'Tương tác bài đăng', 'feed', 'react', 'Thả, đổi và gỡ cảm xúc trên bài đăng'),
        ('FEED_UPDATE', 'Chỉnh sửa bài đăng', 'feed', 'update', 'Chia sẻ / gỡ bài đăng, ẩn số tiền và sửa caption')
      ON CONFLICT ("code") DO NOTHING
    `);

    // Cấp mặc định cho vai trò USER để người dùng thường dùng được Bảng tin
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'USER' AND p.code IN ('FEED_READ', 'FEED_REACT', 'FEED_UPDATE')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE "code" IN ('FEED_READ', 'FEED_REACT', 'FEED_UPDATE')
      )
    `);
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE "code" IN ('FEED_READ', 'FEED_REACT', 'FEED_UPDATE')`,
    );
  }
}