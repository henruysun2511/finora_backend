import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetsModule1795000000000 implements MigrationInterface {
  name = 'AddBudgetsModule1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budgets"
      DROP CONSTRAINT "FK_7f57b6f0516ef8c196d38743adb",
      DROP CONSTRAINT "FK_4bb589bf6db49e8c1fd6af05f49"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."budgets_period_enum_new"
      AS ENUM ('weekly', 'monthly', 'yearly')
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ALTER COLUMN "period" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ALTER COLUMN "period" TYPE "public"."budgets_period_enum_new"
      USING lower("period"::text)::"public"."budgets_period_enum_new"
    `);
    await queryRunner.query(`DROP TYPE "public"."budgets_period_enum"`);
    await queryRunner.query(`
      ALTER TYPE "public"."budgets_period_enum_new"
      RENAME TO "budgets_period_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" RENAME COLUMN "amount_limit" TO "limit_amount"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD "start_date" date,
      ADD "is_rollover" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "budgets"
      SET "start_date" = "period_start"::date,
          "is_rollover" = "rollover_enabled"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ALTER COLUMN "start_date" SET NOT NULL,
      ALTER COLUMN "period" SET DEFAULT 'monthly'
    `);
    await queryRunner.query(`
      CREATE TABLE "budget_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "budget_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "limit_amount" numeric(15,2) NOT NULL,
        "spent_amount" numeric(15,2) NOT NULL DEFAULT '0',
        "rollover_amount" numeric(15,2) NOT NULL DEFAULT '0',
        "warning_alert_sent" boolean NOT NULL DEFAULT false,
        "exceeded_alert_sent" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_budget_periods" PRIMARY KEY ("id"),
        CONSTRAINT "uq_budget_periods_budget_dates"
          UNIQUE ("budget_id", "start_date", "end_date")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "budget_periods"
        ("budget_id", "start_date", "end_date", "limit_amount", "spent_amount")
      SELECT "id", "period_start"::date, "period_end"::date, "limit_amount", "used_amount"
      FROM "budgets"
    `);
    await queryRunner.query(`
      UPDATE "budgets"
      SET "deleted_at" = now()
      WHERE "is_active" = false AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      DROP COLUMN "used_amount",
      DROP COLUMN "period_start",
      DROP COLUMN "period_end",
      DROP COLUMN "rollover_enabled",
      DROP COLUMN "notify_threshold",
      DROP COLUMN "is_active"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_budgets_wallet_category_period_active"
      ON "budgets" ("wallet_id", "category_id", "period")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`DROP INDEX "IDX_7f57b6f0516ef8c196d38743ad"`);
    await queryRunner.query(`DROP INDEX "IDX_4bb589bf6db49e8c1fd6af05f4"`);
    await queryRunner.query(`
      CREATE INDEX "idx_budgets_wallet_id" ON "budgets" ("wallet_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_budgets_category_id" ON "budgets" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_budget_periods_budget_id" ON "budget_periods" ("budget_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_budget_periods_start_date" ON "budget_periods" ("start_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_budget_periods_end_date" ON "budget_periods" ("end_date")
    `);
    await queryRunner.query(`
      ALTER TABLE "budget_periods"
      ADD CONSTRAINT "FK_budget_periods_budget"
      FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD CONSTRAINT "FK_budgets_wallet"
      FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "FK_budgets_category"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('BUDGETS_CREATE', 'Tạo ngân sách', 'budgets', 'create', 'Tạo ngân sách cho ví'),
        ('BUDGETS_READ', 'Xem ngân sách', 'budgets', 'read', 'Xem tiến độ và lịch sử ngân sách'),
        ('BUDGETS_UPDATE', 'Cập nhật ngân sách', 'budgets', 'update', 'Cập nhật hoặc chuyển chu kỳ ngân sách'),
        ('BUDGETS_DELETE', 'Xóa ngân sách', 'budgets', 'delete', 'Xóa ngân sách')
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE
        (r."code" = 'USER' AND p."code" IN
          ('BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE'))
        OR
        (r."code" = 'OWNER' AND p."code" IN
          ('BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE'))
        OR (r."code" = 'EDITOR' AND p."code" IN
          ('BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE'))
        OR (r."code" = 'VIEWER' AND p."code" = 'BUDGETS_READ')
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN ('BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE')
      )
    `);
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN ('BUDGETS_CREATE', 'BUDGETS_READ', 'BUDGETS_UPDATE', 'BUDGETS_DELETE')
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_wallet",
      DROP CONSTRAINT "FK_budgets_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "budget_periods" DROP CONSTRAINT "FK_budget_periods_budget"
    `);
    await queryRunner.query(
      `DROP INDEX "uq_budgets_wallet_category_period_active"`,
    );
    await queryRunner.query(`DROP INDEX "idx_budgets_wallet_id"`);
    await queryRunner.query(`DROP INDEX "idx_budgets_category_id"`);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD "used_amount" numeric(15,2) NOT NULL DEFAULT '0',
      ADD "period_start" TIMESTAMP WITH TIME ZONE,
      ADD "period_end" TIMESTAMP WITH TIME ZONE,
      ADD "rollover_enabled" boolean NOT NULL DEFAULT false,
      ADD "notify_threshold" integer NOT NULL DEFAULT '80',
      ADD "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      UPDATE "budgets"
      SET "used_amount" = COALESCE((
            SELECT bp."spent_amount"
            FROM "budget_periods" bp
            WHERE bp."budget_id" = "budgets"."id"
            ORDER BY bp."start_date" DESC
            LIMIT 1
          ), 0),
          "period_start" = "start_date"::timestamptz,
          "period_end" = ("start_date" + INTERVAL '1 month')::timestamptz,
          "rollover_enabled" = "is_rollover"
    `);
    await queryRunner.query(`DROP TABLE "budget_periods"`);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ALTER COLUMN "period_start" SET NOT NULL,
      ALTER COLUMN "period_end" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" DROP COLUMN "start_date", DROP COLUMN "is_rollover"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" RENAME COLUMN "limit_amount" TO "amount_limit"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."budgets_period_enum_old" AS ENUM ('WEEKLY', 'MONTHLY')
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" ALTER COLUMN "period" DROP DEFAULT
    `);
    await queryRunner.query(`
      UPDATE "budgets" SET "period" = 'monthly' WHERE "period" = 'yearly'
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ALTER COLUMN "period" TYPE "public"."budgets_period_enum_old"
      USING upper("period"::text)::"public"."budgets_period_enum_old"
    `);
    await queryRunner.query(`DROP TYPE "public"."budgets_period_enum"`);
    await queryRunner.query(`
      ALTER TYPE "public"."budgets_period_enum_old" RENAME TO "budgets_period_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" ALTER COLUMN "period" SET DEFAULT 'MONTHLY'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_7f57b6f0516ef8c196d38743ad" ON "budgets" ("wallet_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_4bb589bf6db49e8c1fd6af05f4" ON "budgets" ("category_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD CONSTRAINT "FK_7f57b6f0516ef8c196d38743adb"
      FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION,
      ADD CONSTRAINT "FK_4bb589bf6db49e8c1fd6af05f49"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }
}
