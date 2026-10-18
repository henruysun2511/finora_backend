import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRespondedAtToFriendships1792000000000 implements MigrationInterface {
  name = 'AddRespondedAtToFriendships1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP COLUMN IF EXISTS "responded_at"`,
    );
  }
}
