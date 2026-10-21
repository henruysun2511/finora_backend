import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequirePinForTransactionsToUserSettings1797800000000
  implements MigrationInterface
{
  name = 'AddRequirePinForTransactionsToUserSettings1797800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      ADD COLUMN IF NOT EXISTS "require_pin_for_transactions" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
      DROP COLUMN IF EXISTS "require_pin_for_transactions";
    `);
  }
}
