import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentMascotTierToUserSettings1797300000000
  implements MigrationInterface
{
  name = 'AddCurrentMascotTierToUserSettings1797300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings" 
      ADD COLUMN IF NOT EXISTS "current_mascot_tier_id" uuid REFERENCES "asset_tiers"("id") ON DELETE SET NULL;
    `);

    // Thêm giá trị ASSET_TIER_DOWN vào ENUM nếu chưa có
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type typ
          JOIN pg_enum enm ON enm.enumtypid = typ.oid
          WHERE typ.typname = 'notifications_type_enum' AND enm.enumlabel = 'ASSET_TIER_DOWN'
        ) THEN
          ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'ASSET_TIER_DOWN';
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings" 
      DROP COLUMN IF EXISTS "current_mascot_tier_id";
    `);
  }
}
