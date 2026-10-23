import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsToUserSettings1797700000000
  implements MigrationInterface
{
  name = 'AddAiSettingsToUserSettings1797700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_settings_ai_provider_enum') THEN
          CREATE TYPE "user_settings_ai_provider_enum" AS ENUM ('GEMINI', 'OPENAI');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "ai_provider" "user_settings_ai_provider_enum" NOT NULL DEFAULT 'GEMINI',
      ADD COLUMN IF NOT EXISTS "ai_api_key" character varying(255) NULL,
      ADD COLUMN IF NOT EXISTS "ai_model" character varying(100) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "ai_model",
      DROP COLUMN IF EXISTS "ai_api_key",
      DROP COLUMN IF EXISTS "ai_provider";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "user_settings_ai_provider_enum";
    `);
  }
}
