import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTableAndSeedPermissions1797000000000
  implements MigrationInterface
{
  name = 'CreateAuditLogsTableAndSeedPermissions1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "user_id" uuid,
        "wallet_id" uuid,
        "action" character varying(100) NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid,
        "ip_address" character varying(45),
        "user_agent" text,
        "old_value" jsonb,
        "new_value" jsonb,
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_wallet_id" ON "audit_logs" ("wallet_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs" ("entity_type");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_id" ON "audit_logs" ("entity_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at" DESC);
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('AUDIT_LOGS_READ', 'Xem nhật ký hoạt động', 'audit_logs', 'read', 'Xem lịch sử hoạt động và timeline biến động'),
        ('AUDIT_LOGS_EXPORT', 'Xuất báo cáo nhật ký', 'audit_logs', 'export', 'Xuất nhật ký hoạt động ra file CSV/Excel')
      ON CONFLICT ("code") DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code IN ('USER', 'ADMIN') AND p.code IN ('AUDIT_LOGS_READ', 'AUDIT_LOGS_EXPORT')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE "code" IN ('AUDIT_LOGS_READ', 'AUDIT_LOGS_EXPORT')
      );
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" IN ('AUDIT_LOGS_READ', 'AUDIT_LOGS_EXPORT');
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
  }
}
