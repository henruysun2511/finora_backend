import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotoUrlToTransactions1791000000000 implements MigrationInterface {
  name = 'AddPhotoUrlToTransactions1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "photo_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "photo_type" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "photo_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "photo_url"`,
    );
  }
}
