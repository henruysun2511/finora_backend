import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignWalletMembersRoleAndStatus1798100000000
  implements MigrationInterface
{
  name = 'AlignWalletMembersRoleAndStatus1798100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove legacy role_id column and foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "wallet_members" DROP CONSTRAINT IF EXISTS "FK_156caa977aa89e51aecd2114441";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_156caa977aa89e51aecd211444";
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_members" DROP COLUMN IF EXISTS "role_id";
    `);

    // 2. Create wallet_members_role_enum and add role column
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_members_role_enum') THEN
          CREATE TYPE "public"."wallet_members_role_enum" AS ENUM('owner', 'editor', 'viewer');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_members"
      ADD COLUMN IF NOT EXISTS "role" "public"."wallet_members_role_enum" NOT NULL DEFAULT 'viewer';
    `);

    // 3. Create wallet_members_status_enum and add status column
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_members_status_enum') THEN
          CREATE TYPE "public"."wallet_members_status_enum" AS ENUM('pending', 'accepted', 'rejected');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_members"
      ADD COLUMN IF NOT EXISTS "status" "public"."wallet_members_status_enum" NOT NULL DEFAULT 'accepted';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_members" DROP COLUMN IF EXISTS "status";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."wallet_members_status_enum";
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_members" DROP COLUMN IF EXISTS "role";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."wallet_members_role_enum";
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_members" ADD COLUMN IF NOT EXISTS "role_id" uuid;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_156caa977aa89e51aecd211444" ON "wallet_members" ("role_id");
    `);
  }
}
