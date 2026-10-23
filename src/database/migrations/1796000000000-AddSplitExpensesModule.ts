import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSplitExpensesModule1796000000000 implements MigrationInterface {
  name = 'AddSplitExpensesModule1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo các kiểu ENUM
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_splits_split_type_enum') THEN
          CREATE TYPE "public"."expense_splits_split_type_enum" AS ENUM ('equal', 'custom', 'percentage');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_splits_status_enum') THEN
          CREATE TYPE "public"."expense_splits_status_enum" AS ENUM ('pending', 'all_accepted', 'confirmed', 'cancelled');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'split_participants_status_enum') THEN
          CREATE TYPE "public"."split_participants_status_enum" AS ENUM ('pending', 'accepted', 'rejected', 'proposed');
        END IF;
      END $$;
    `);

    // 2. Tạo bảng expense_splits
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_splits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "transaction_id" uuid NOT NULL,
        "wallet_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "total_amount" numeric(15,2) NOT NULL,
        "split_type" "public"."expense_splits_split_type_enum" NOT NULL DEFAULT 'equal',
        "status" "public"."expense_splits_status_enum" NOT NULL DEFAULT 'pending',
        CONSTRAINT "UQ_expense_splits_transaction_id" UNIQUE ("transaction_id"),
        CONSTRAINT "PK_expense_splits_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_splits_transaction_id" ON "expense_splits" ("transaction_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_splits_wallet_id" ON "expense_splits" ("wallet_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_splits_created_by_id" ON "expense_splits" ("created_by_id")
    `);

    // 3. Tạo bảng split_participants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "split_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "split_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "assigned_amount" numeric(15,2) NOT NULL,
        "proposed_amount" numeric(15,2),
        "status" "public"."split_participants_status_enum" NOT NULL DEFAULT 'pending',
        "note" text,
        "loan_id" uuid,
        "is_settled" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_split_participants_split_user" UNIQUE ("split_id", "user_id"),
        CONSTRAINT "PK_split_participants_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_split_participants_split_id" ON "split_participants" ("split_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_split_participants_user_id" ON "split_participants" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_split_participants_loan_id" ON "split_participants" ("loan_id")
    `);

    // 4. Thiết lập Foreign Keys
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expense_splits_transaction_id') THEN
          ALTER TABLE "expense_splits" ADD CONSTRAINT "FK_expense_splits_transaction_id"
            FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expense_splits_wallet_id') THEN
          ALTER TABLE "expense_splits" ADD CONSTRAINT "FK_expense_splits_wallet_id"
            FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expense_splits_created_by_id') THEN
          ALTER TABLE "expense_splits" ADD CONSTRAINT "FK_expense_splits_created_by_id"
            FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_split_participants_split_id') THEN
          ALTER TABLE "split_participants" ADD CONSTRAINT "FK_split_participants_split_id"
            FOREIGN KEY ("split_id") REFERENCES "expense_splits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_split_participants_user_id') THEN
          ALTER TABLE "split_participants" ADD CONSTRAINT "FK_split_participants_user_id"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_split_participants_loan_id') THEN
          ALTER TABLE "split_participants" ADD CONSTRAINT "FK_split_participants_loan_id"
            FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // 5. Seed Permissions cho Split Expenses
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('SPLIT_EXPENSES_CREATE', 'Khởi tạo chia tiền', 'split_expenses', 'create', 'Tạo phiên chia tiền giao dịch với bạn bè'),
        ('SPLIT_EXPENSES_READ', 'Xem phiên chia tiền', 'split_expenses', 'read', 'Xem thông tin và tiến độ phiên chia tiền'),
        ('SPLIT_EXPENSES_UPDATE', 'Cập nhật phiên chia tiền', 'split_expenses', 'update', 'Phản hồi, đề xuất lại hoặc điều chỉnh số tiền chia'),
        ('SPLIT_EXPENSES_DELETE', 'Hủy phiên chia tiền', 'split_expenses', 'delete', 'Hủy bỏ phiên chia tiền')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'USER' AND p.code IN (
        'SPLIT_EXPENSES_CREATE',
        'SPLIT_EXPENSES_READ',
        'SPLIT_EXPENSES_UPDATE',
        'SPLIT_EXPENSES_DELETE'
      )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE "code" IN (
          'SPLIT_EXPENSES_CREATE',
          'SPLIT_EXPENSES_READ',
          'SPLIT_EXPENSES_UPDATE',
          'SPLIT_EXPENSES_DELETE'
        )
      )
    `);
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" IN (
        'SPLIT_EXPENSES_CREATE',
        'SPLIT_EXPENSES_READ',
        'SPLIT_EXPENSES_UPDATE',
        'SPLIT_EXPENSES_DELETE'
      )
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "split_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_splits"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."split_participants_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."expense_splits_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."expense_splits_split_type_enum"`);
  }
}
