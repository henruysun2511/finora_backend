import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToAssetTiers1798400000000
  implements MigrationInterface
{
  name = 'AddIsActiveToAssetTiers1798400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asset_tiers" 
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asset_tiers" 
      DROP COLUMN IF EXISTS "is_active";
    `);
  }
}
