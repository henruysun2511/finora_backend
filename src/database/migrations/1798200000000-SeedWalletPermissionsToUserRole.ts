import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedWalletPermissionsToUserRole1798200000000
  implements MigrationInterface
{
  name = 'SeedWalletPermissionsToUserRole1798200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code IN ('USER', 'ADMIN') AND p.resource = 'wallets'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE role_id IN (SELECT id FROM "roles" WHERE code IN ('USER', 'ADMIN'))
        AND permission_id IN (SELECT id FROM "permissions" WHERE resource = 'wallets');
    `);
  }
}
