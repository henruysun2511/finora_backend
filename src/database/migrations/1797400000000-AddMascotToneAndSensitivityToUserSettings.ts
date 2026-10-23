import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMascotToneAndSensitivityToUserSettings1797400000000
  implements MigrationInterface
{
  name = 'AddMascotToneAndSensitivityToUserSettings1797400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_settings_mascot_tone_enum') THEN
          CREATE TYPE "user_settings_mascot_tone_enum" AS ENUM ('GENTLE', 'BALANCED', 'ROAST');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_settings_mascot_sensitivity_enum') THEN
          CREATE TYPE "user_settings_mascot_sensitivity_enum" AS ENUM ('ALL', 'ANOMALIES_ONLY', 'SILENT');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "mascot_tone" "user_settings_mascot_tone_enum" NOT NULL DEFAULT 'BALANCED',
      ADD COLUMN IF NOT EXISTS "mascot_sensitivity" "user_settings_mascot_sensitivity_enum" NOT NULL DEFAULT 'ANOMALIES_ONLY';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "mascot_sensitivity",
      DROP COLUMN IF EXISTS "mascot_tone";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "user_settings_mascot_sensitivity_enum";
      DROP TYPE IF EXISTS "user_settings_mascot_tone_enum";
    `);
  }
}
