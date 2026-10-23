import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameToUsersTable1796000000000 implements MigrationInterface {
  name = 'AddUsernameToUsersTable1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "username" character varying(100)
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "username" = split_part("email", '@', 1)
      WHERE "username" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_username"
      ON "users" ("username")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_username"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "username"
    `);
  }
}
