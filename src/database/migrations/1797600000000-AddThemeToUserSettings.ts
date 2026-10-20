import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeToUserSettings1797600000000 implements MigrationInterface {
  name = 'AddThemeToUserSettings1797600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_settings_theme_enum') THEN
          CREATE TYPE "user_settings_theme_enum" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "theme" "user_settings_theme_enum" NOT NULL DEFAULT 'SYSTEM';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "theme";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "user_settings_theme_enum";
    `);
  }
}
