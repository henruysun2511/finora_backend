// src/database/migrations/1790900000000-AddAccountBalanceAndAdjustments.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountBalanceAndAdjustments1790900000000
  implements MigrationInterface
{
  name = 'AddAccountBalanceAndAdjustments1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Bổ sung cột cho bảng accounts
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "balance" numeric(19,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "initial_balance" numeric(19,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "idempotency_key" character varying(100)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_accounts_creator_idempotency" ON "accounts" ("created_by", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );

    // 2. Bảng lịch sử điều chỉnh số dư
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_balance_adjustments_direction_enum') THEN
          CREATE TYPE "account_balance_adjustments_direction_enum" AS ENUM ('INCREASE', 'DECREASE');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_balance_adjustments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "account_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "direction" "account_balance_adjustments_direction_enum" NOT NULL,
        "amount" numeric(19,2) NOT NULL,
        "balance_before" numeric(19,2) NOT NULL,
        "balance_after" numeric(19,2) NOT NULL,
        "reason" character varying(255) NOT NULL,
        "idempotency_key" character varying(100) NOT NULL,
        CONSTRAINT "PK_account_balance_adjustments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_acc_adj_account_id" FOREIGN KEY ("account_id")
          REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_acc_adj_account_id" ON "account_balance_adjustments" ("account_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_acc_adj_account_idempotency" ON "account_balance_adjustments" ("account_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "account_balance_adjustments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "account_balance_adjustments_direction_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_accounts_creator_idempotency"`,
    );
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "idempotency_key"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "archived_at"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "initial_balance"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "balance"`);
  }
}