import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBiometricFromUserSettings1797500000000
  implements MigrationInterface
{
  name = 'DropBiometricFromUserSettings1797500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "biometric_enabled";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "biometric_enabled" boolean NOT NULL DEFAULT false;
    `);
  }
}
