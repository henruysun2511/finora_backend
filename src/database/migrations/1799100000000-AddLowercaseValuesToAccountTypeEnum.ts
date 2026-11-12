import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLowercaseValuesToAccountTypeEnum1799100000000 implements MigrationInterface {
  name = 'AddLowercaseValuesToAccountTypeEnum1799100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."accounts_type_enum" ADD VALUE IF NOT EXISTS 'cash';`);
    await queryRunner.query(`ALTER TYPE "public"."accounts_type_enum" ADD VALUE IF NOT EXISTS 'bank';`);
    await queryRunner.query(`ALTER TYPE "public"."accounts_type_enum" ADD VALUE IF NOT EXISTS 'ewallet';`);
    await queryRunner.query(`ALTER TYPE "public"."accounts_type_enum" ADD VALUE IF NOT EXISTS 'credit';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type directly
  }
}

