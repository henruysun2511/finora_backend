import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToWallets1798000000000
  implements MigrationInterface
{
  name = 'AddIsActiveToWallets1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallets"
      DROP COLUMN IF EXISTS "is_active";
    `);
  }
}
