import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffectsBalanceToLoansAndPayments1797100000000
  implements MigrationInterface
{
  name = 'AddAffectsBalanceToLoansAndPayments1797100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "affects_balance" boolean NOT NULL DEFAULT true;
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_payments" ADD COLUMN IF NOT EXISTS "affects_balance" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_payments" DROP COLUMN IF EXISTS "affects_balance";
    `);
    await queryRunner.query(`
      ALTER TABLE "loans" DROP COLUMN IF EXISTS "affects_balance";
    `);
  }
}
