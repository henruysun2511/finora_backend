import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconToAccounts1799000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(255);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "icon";`);
    }
}