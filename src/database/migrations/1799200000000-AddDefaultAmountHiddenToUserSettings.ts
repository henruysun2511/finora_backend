import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultAmountHiddenToUserSettings1799200000000
  implements MigrationInterface
{
  name = 'AddDefaultAmountHiddenToUserSettings1799200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "default_amount_hidden" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "default_amount_hidden";
    `);
  }
}
