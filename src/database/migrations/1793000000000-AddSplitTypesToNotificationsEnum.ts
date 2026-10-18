import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSplitTypesToNotificationsEnum1793000000000 implements MigrationInterface {
  name = 'AddSplitTypesToNotificationsEnum1793000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SPLIT_REQUEST'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SPLIT_PROPOSAL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SPLIT_ACCEPTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SPLIT_CONFIRMED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'SYSTEM_ANNOUNCEMENT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL không hỗ trợ drop value đơn lẻ khỏi enum
  }
}
