import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendingActionsAndAlignChatMessages1797900000000
  implements MigrationInterface
{
  name = 'CreatePendingActionsAndAlignChatMessages1797900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Cập nhật các giá trị enum mới cho chat_messages_message_type_enum
    await queryRunner.query(`
      ALTER TYPE "public"."chat_messages_message_type_enum" ADD VALUE IF NOT EXISTS 'STAT_CARD';
      ALTER TYPE "public"."chat_messages_message_type_enum" ADD VALUE IF NOT EXISTS 'CHART_PIE';
      ALTER TYPE "public"."chat_messages_message_type_enum" ADD VALUE IF NOT EXISTS 'CHART_BAR';
      ALTER TYPE "public"."chat_messages_message_type_enum" ADD VALUE IF NOT EXISTS 'TRANSACTION_LIST';
      ALTER TYPE "public"."chat_messages_message_type_enum" ADD VALUE IF NOT EXISTS 'CONFIRMATION_PROMPT';
    `);

    // 2. Bổ sung các cột intent và mascot vào chat_messages
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "intent" character varying(50) NULL,
      ADD COLUMN IF NOT EXISTS "mascot" character varying(50) NULL;
    `);

    // 3. Tạo enum pending_actions_status_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pending_actions_status_enum') THEN
          CREATE TYPE "pending_actions_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');
        END IF;
      END$$;
    `);

    // 4. Tạo bảng pending_actions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pending_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "wallet_id" uuid NOT NULL,
        "chat_message_id" uuid,
        "transaction_id" uuid,
        "tool_name" character varying(100) NOT NULL,
        "tool_input" jsonb NOT NULL,
        "preview_payload" jsonb NOT NULL,
        "status" "pending_actions_status_enum" NOT NULL DEFAULT 'PENDING',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_pending_actions_id" PRIMARY KEY ("id")
      );
    `);

    // 5. Tạo indexes cho bảng pending_actions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_user_id" ON "pending_actions" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_wallet_id" ON "pending_actions" ("wallet_id");
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_chat_message_id" ON "pending_actions" ("chat_message_id");
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_transaction_id" ON "pending_actions" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_status" ON "pending_actions" ("status");
      CREATE INDEX IF NOT EXISTS "idx_pending_actions_expires_at" ON "pending_actions" ("expires_at");
    `);

    // 6. Tạo Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "pending_actions"
      ADD CONSTRAINT "FK_pending_actions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      ADD CONSTRAINT "FK_pending_actions_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      ADD CONSTRAINT "FK_pending_actions_chat_message_id" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      ADD CONSTRAINT "FK_pending_actions_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pending_actions" DROP CONSTRAINT IF EXISTS "FK_pending_actions_transaction_id";
      ALTER TABLE "pending_actions" DROP CONSTRAINT IF EXISTS "FK_pending_actions_chat_message_id";
      ALTER TABLE "pending_actions" DROP CONSTRAINT IF EXISTS "FK_pending_actions_wallet_id";
      ALTER TABLE "pending_actions" DROP CONSTRAINT IF EXISTS "FK_pending_actions_user_id";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "pending_actions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pending_actions_status_enum";`);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP COLUMN IF EXISTS "mascot",
      DROP COLUMN IF EXISTS "intent";
    `);
  }
}
