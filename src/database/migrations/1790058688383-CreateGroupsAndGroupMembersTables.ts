import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGroupsAndGroupMembersTables1790058688383 implements MigrationInterface {
    name = 'CreateGroupsAndGroupMembersTables1790058688383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying(150) NOT NULL, "description" text, "avatar" character varying(500), "owner_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_664ea405ae2a10c264d582ee56" ON "groups" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d7af25843377def343ab0beaa" ON "groups" ("owner_id") `);
        await queryRunner.query(`CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "group_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c840df5db52dc6b4a1b0b69c6" ON "group_members" ("group_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_20a555b299f75843aa53ff8b0e" ON "group_members" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_41a8d05040fc2f818a74d68c42" ON "group_members" ("role_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f5939ee0ad233ad35e03f5c65c" ON "group_members" ("group_id", "user_id") `);
        await queryRunner.query(`ALTER TABLE "groups" ADD CONSTRAINT "FK_5d7af25843377def343ab0beaa8" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_41a8d05040fc2f818a74d68c42d" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO "roles" ("code", "name", "description", "is_active")
            VALUES 
                ('OWNER', 'Group Owner', 'Chủ sở hữu nhóm với toàn quyền quản trị', true),
                ('ADMIN_GROUP', 'Group Admin', 'Quản trị viên nhóm với quyền quản lý thành viên và thiết lập', true),
                ('MEMBER', 'Group Member', 'Thành viên cơ bản của nhóm', true)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "roles" WHERE "code" IN ('OWNER', 'ADMIN_GROUP', 'MEMBER')
        `);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_41a8d05040fc2f818a74d68c42d"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP CONSTRAINT "FK_5d7af25843377def343ab0beaa8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f5939ee0ad233ad35e03f5c65c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_41a8d05040fc2f818a74d68c42"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20a555b299f75843aa53ff8b0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c840df5db52dc6b4a1b0b69c6"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d7af25843377def343ab0beaa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_664ea405ae2a10c264d582ee56"`);
        await queryRunner.query(`DROP TABLE "groups"`);
    }
}

