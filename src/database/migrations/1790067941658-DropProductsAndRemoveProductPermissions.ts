import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProductsAndRemoveProductPermissions1790067941658
  implements MigrationInterface
{
  name = 'DropProductsAndRemoveProductPermissions1790067941658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions"
        WHERE "code" IN ('PRODUCTS_CREATE', 'PRODUCTS_READ', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE')
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN ('PRODUCTS_CREATE', 'PRODUCTS_READ', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE')
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."products_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying(200) NOT NULL, "sku" character varying(100) NOT NULL, "description" text, "price" numeric(12,2) NOT NULL, "stock" integer NOT NULL DEFAULT '0', "category" character varying(100) NOT NULL DEFAULT 'General', "status" "public"."products_status_enum" NOT NULL DEFAULT 'ACTIVE', "is_available" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c9fb58de893725258746385e1" ON "products" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "products" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3932231d2385ac248d0888d95" ON "products" ("category") `,
    );
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
      VALUES
        ('PRODUCTS_CREATE', 'Tạo sản phẩm', 'products', 'create', 'Tạo sản phẩm mới'),
        ('PRODUCTS_READ', 'Xem sản phẩm', 'products', 'read', 'Xem danh sách và chi tiết sản phẩm'),
        ('PRODUCTS_UPDATE', 'Cập nhật sản phẩm', 'products', 'update', 'Cập nhật thông tin sản phẩm'),
        ('PRODUCTS_DELETE', 'Xóa sản phẩm', 'products', 'delete', 'Xóa sản phẩm')
      ON CONFLICT ("code") DO NOTHING;
    `);
  }
}
