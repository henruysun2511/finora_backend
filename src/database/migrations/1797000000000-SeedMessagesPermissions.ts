import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMessagesPermissions1797000000000 implements MigrationInterface {
  name = 'SeedMessagesPermissions1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('MESSAGES_CREATE', 'Gửi tin nhắn', 'messages', 'create', 'Gửi tin nhắn và thả cảm xúc'),
        ('MESSAGES_READ', 'Xem tin nhắn', 'messages', 'read', 'Xem hộp thư và lịch sử tin nhắn'),
        ('MESSAGES_UPDATE', 'Cập nhật tin nhắn', 'messages', 'update', 'Đánh dấu tin nhắn đã đọc'),
        ('MESSAGES_DELETE', 'Thu hồi tin nhắn', 'messages', 'delete', 'Thu hồi tin nhắn và gỡ cảm xúc')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'USER'
        AND p.code IN ('MESSAGES_CREATE', 'MESSAGES_READ', 'MESSAGES_UPDATE', 'MESSAGES_DELETE')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions"
        WHERE "code" IN ('MESSAGES_CREATE', 'MESSAGES_READ', 'MESSAGES_UPDATE', 'MESSAGES_DELETE')
      )
    `);
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN ('MESSAGES_CREATE', 'MESSAGES_READ', 'MESSAGES_UPDATE', 'MESSAGES_DELETE')
    `);
  }
}
