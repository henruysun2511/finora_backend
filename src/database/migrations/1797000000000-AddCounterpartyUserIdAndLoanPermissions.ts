import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCounterpartyUserIdAndLoanPermissions1797000000000
  implements MigrationInterface
{
  name = 'AddCounterpartyUserIdAndLoanPermissions1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'loans' AND column_name = 'counterparty_user_id'
        ) THEN
          ALTER TABLE "loans" ADD COLUMN "counterparty_user_id" uuid;
          CREATE INDEX IF NOT EXISTS "idx_loans_counterparty_user_id" ON "loans" ("counterparty_user_id");
          ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_counterparty_user_id" 
            FOREIGN KEY ("counterparty_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('LOANS_CREATE', 'Tạo khoản vay/nợ', 'loans', 'create', 'Tạo khoản cho vay, đi vay hoặc mua trả góp'),
        ('LOANS_READ', 'Xem sổ nợ', 'loans', 'read', 'Xem danh sách và chi tiết các khoản vay/nợ'),
        ('LOANS_UPDATE', 'Cập nhật khoản nợ', 'loans', 'update', 'Cập nhật hạn trả, ghi chú hoặc thanh toán khoản nợ'),
        ('LOANS_DELETE', 'Xóa khoản nợ', 'loans', 'delete', 'Xóa khoản vay/nợ chưa thanh toán')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code IN ('USER', 'OWNER', 'EDITOR') AND p.code IN (
        'LOANS_CREATE',
        'LOANS_READ',
        'LOANS_UPDATE',
        'LOANS_DELETE'
      )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'VIEWER' AND p.code = 'LOANS_READ'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE "code" IN ('LOANS_CREATE', 'LOANS_READ', 'LOANS_UPDATE', 'LOANS_DELETE')
      )
    `);
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" IN ('LOANS_CREATE', 'LOANS_READ', 'LOANS_UPDATE', 'LOANS_DELETE')
    `);
    await queryRunner.query(`
      ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_counterparty_user_id";
      DROP INDEX IF EXISTS "idx_loans_counterparty_user_id";
      ALTER TABLE "loans" DROP COLUMN IF EXISTS "counterparty_user_id";
    `);
  }
}
