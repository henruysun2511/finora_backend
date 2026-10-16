import { MigrationInterface, QueryRunner } from "typeorm";

export class DropGroupsAndMigratePermissionsToWallets1790751093117 implements MigrationInterface {
    name = 'DropGroupsAndMigratePermissionsToWallets1790751093117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Update roles in "roles" table
        await queryRunner.query(`UPDATE "roles" SET "code" = 'EDITOR', "name" = 'Wallet Editor', "description" = 'Biên tập viên ví với quyền quản lý giao dịch và danh mục' WHERE "code" = 'ADMIN_GROUP'`);
        await queryRunner.query(`UPDATE "roles" SET "code" = 'VIEWER', "name" = 'Wallet Viewer', "description" = 'Người xem ví với quyền chỉ đọc' WHERE "code" = 'MEMBER'`);
        await queryRunner.query(`UPDATE "roles" SET "name" = 'Wallet Owner', "description" = 'Chủ sở hữu ví với toàn quyền quản trị' WHERE "code" = 'OWNER'`);
        await queryRunner.query(`
            INSERT INTO "roles" ("code", "name", "description", "is_active")
            VALUES 
                ('OWNER', 'Wallet Owner', 'Chủ sở hữu ví với toàn quyền quản trị', true),
                ('EDITOR', 'Wallet Editor', 'Biên tập viên ví với quyền quản lý giao dịch và danh mục', true),
                ('VIEWER', 'Wallet Viewer', 'Người xem ví với quyền chỉ đọc', true)
            ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description"
        `);

        // 2. Update permissions in "permissions" table (GROUPS_* -> WALLETS_*)
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_CREATE', "name" = 'Tạo ví', "resource" = 'wallets', "action" = 'create', "description" = 'Tạo ví mới' WHERE "code" = 'GROUPS_CREATE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_READ', "name" = 'Xem thông tin ví', "resource" = 'wallets', "action" = 'read', "description" = 'Xem danh sách và chi tiết ví' WHERE "code" = 'GROUPS_READ'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_UPDATE', "name" = 'Cập nhật ví', "resource" = 'wallets', "action" = 'update', "description" = 'Cập nhật thông tin ví' WHERE "code" = 'GROUPS_UPDATE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_DELETE', "name" = 'Xóa ví', "resource" = 'wallets', "action" = 'delete', "description" = 'Giải tán hoặc xóa ví' WHERE "code" = 'GROUPS_DELETE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_TRANSFER_OWNERSHIP', "name" = 'Chuyển nhượng quyền ví', "resource" = 'wallets', "action" = 'transfer_ownership', "description" = 'Chuyển nhượng quyền sở hữu ví' WHERE "code" = 'GROUPS_TRANSFER_OWNERSHIP'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_MEMBER_INVITE', "name" = 'Mời thành viên ví', "resource" = 'wallets', "action" = 'invite_member', "description" = 'Mời thành viên vào ví' WHERE "code" = 'GROUPS_MEMBER_INVITE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_MEMBER_ASSIGN_ROLE', "name" = 'Gán vai trò thành viên ví', "resource" = 'wallets', "action" = 'assign_member_role', "description" = 'Thay đổi vai trò thành viên ví' WHERE "code" = 'GROUPS_MEMBER_ASSIGN_ROLE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'WALLETS_MEMBER_KICK', "name" = 'Xóa thành viên khỏi ví', "resource" = 'wallets', "action" = 'kick_member', "description" = 'Mời thành viên ra khỏi ví' WHERE "code" = 'GROUPS_MEMBER_KICK'`);

        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
            VALUES
                ('WALLETS_CREATE', 'Tạo ví', 'wallets', 'create', 'Tạo ví mới'),
                ('WALLETS_READ', 'Xem thông tin ví', 'wallets', 'read', 'Xem danh sách và chi tiết ví'),
                ('WALLETS_UPDATE', 'Cập nhật ví', 'wallets', 'update', 'Cập nhật thông tin ví'),
                ('WALLETS_DELETE', 'Xóa ví', 'wallets', 'delete', 'Giải tán hoặc xóa ví'),
                ('WALLETS_TRANSFER_OWNERSHIP', 'Chuyển nhượng quyền ví', 'wallets', 'transfer_ownership', 'Chuyển nhượng quyền sở hữu ví'),
                ('WALLETS_MEMBER_INVITE', 'Mời thành viên ví', 'wallets', 'invite_member', 'Mời thành viên vào ví'),
                ('WALLETS_MEMBER_ASSIGN_ROLE', 'Gán vai trò thành viên ví', 'wallets', 'assign_member_role', 'Thay đổi vai trò thành viên ví'),
                ('WALLETS_MEMBER_KICK', 'Xóa thành viên khỏi ví', 'wallets', 'kick_member', 'Mời thành viên ra khỏi ví')
            ON CONFLICT ("code") DO NOTHING
        `);

        // 3. Seed default permissions for WALLET roles
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r.code = 'OWNER' AND p.code IN (
                'WALLETS_CREATE', 'WALLETS_READ', 'WALLETS_UPDATE', 'WALLETS_DELETE',
                'WALLETS_TRANSFER_OWNERSHIP', 'WALLETS_MEMBER_INVITE', 'WALLETS_MEMBER_ASSIGN_ROLE', 'WALLETS_MEMBER_KICK'
            )
            ON CONFLICT ("role_id", "permission_id") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r.code = 'EDITOR' AND p.code IN (
                'WALLETS_READ', 'WALLETS_UPDATE', 'WALLETS_MEMBER_INVITE'
            )
            ON CONFLICT ("role_id", "permission_id") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r.code = 'VIEWER' AND p.code IN (
                'WALLETS_READ'
            )
            ON CONFLICT ("role_id", "permission_id") DO NOTHING
        `);

        // 4. Drop groups and group_members tables and constraints
        await queryRunner.query(`ALTER TABLE IF EXISTS "group_members" DROP CONSTRAINT IF EXISTS "FK_41a8d05040fc2f818a74d68c42d"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "group_members" DROP CONSTRAINT IF EXISTS "FK_20a555b299f75843aa53ff8b0ee"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "group_members" DROP CONSTRAINT IF EXISTS "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "groups" DROP CONSTRAINT IF EXISTS "FK_5d7af25843377def343ab0beaa8"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "group_members" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE`);

        // 5. Update wallet_members: drop enum role, add role_id referencing roles(id)
        await queryRunner.query(`ALTER TABLE "wallet_members" DROP COLUMN IF EXISTS "role"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."wallet_members_role_enum"`);
        await queryRunner.query(`ALTER TABLE "wallet_members" ADD "role_id" uuid NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_156caa977aa89e51aecd211444" ON "wallet_members" ("role_id")`);
        await queryRunner.query(`ALTER TABLE "wallet_members" ADD CONSTRAINT "FK_156caa977aa89e51aecd2114441" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Revert wallet_members role_id to role enum
        await queryRunner.query(`ALTER TABLE "wallet_members" DROP CONSTRAINT "FK_156caa977aa89e51aecd2114441"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_156caa977aa89e51aecd211444"`);
        await queryRunner.query(`ALTER TABLE "wallet_members" DROP COLUMN "role_id"`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_members_role_enum" AS ENUM('OWNER', 'EDITOR', 'VIEWER')`);
        await queryRunner.query(`ALTER TABLE "wallet_members" ADD "role" "public"."wallet_members_role_enum" NOT NULL DEFAULT 'VIEWER'`);

        // 2. Re-create groups and group_members tables
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying(150) NOT NULL, "description" text, "avatar" character varying(500), "owner_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_664ea405ae2a10c264d582ee56" ON "groups" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_5d7af25843377def343ab0beaa" ON "groups" ("owner_id")`);
        await queryRunner.query(`CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "group_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c840df5db52dc6b4a1b0b69c6" ON "group_members" ("group_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_20a555b299f75843aa53ff8b0e" ON "group_members" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_41a8d05040fc2f818a74d68c42" ON "group_members" ("role_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f5939ee0ad233ad35e03f5c65c" ON "group_members" ("group_id", "user_id")`);
        await queryRunner.query(`ALTER TABLE "groups" ADD CONSTRAINT "FK_5d7af25843377def343ab0beaa8" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_41a8d05040fc2f818a74d68c42d" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);

        // 3. Revert permissions
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_CREATE', "name" = 'Tạo nhóm', "resource" = 'groups', "action" = 'create', "description" = 'Tạo nhóm mới' WHERE "code" = 'WALLETS_CREATE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_READ', "name" = 'Xem thông tin nhóm', "resource" = 'groups', "action" = 'read', "description" = 'Xem danh sách và chi tiết nhóm' WHERE "code" = 'WALLETS_READ'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_UPDATE', "name" = 'Cập nhật nhóm', "resource" = 'groups', "action" = 'update', "description" = 'Cập nhật thông tin nhóm' WHERE "code" = 'WALLETS_UPDATE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_DELETE', "name" = 'Xóa nhóm', "resource" = 'groups', "action" = 'delete', "description" = 'Giải tán hoặc xóa nhóm' WHERE "code" = 'WALLETS_DELETE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_TRANSFER_OWNERSHIP', "name" = 'Chuyển nhượng quyền nhóm', "resource" = 'groups', "action" = 'transfer_ownership', "description" = 'Chuyển nhượng quyền sở hữu nhóm' WHERE "code" = 'WALLETS_TRANSFER_OWNERSHIP'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_MEMBER_INVITE', "name" = 'Mời thành viên nhóm', "resource" = 'groups', "action" = 'invite_member', "description" = 'Mời thành viên vào nhóm' WHERE "code" = 'WALLETS_MEMBER_INVITE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_MEMBER_ASSIGN_ROLE', "name" = 'Gán vai trò thành viên nhóm', "resource" = 'groups', "action" = 'assign_member_role', "description" = 'Thay đổi vai trò thành viên nhóm' WHERE "code" = 'WALLETS_MEMBER_ASSIGN_ROLE'`);
        await queryRunner.query(`UPDATE "permissions" SET "code" = 'GROUPS_MEMBER_KICK', "name" = 'Xóa thành viên khỏi nhóm', "resource" = 'groups', "action" = 'kick_member', "description" = 'Mời thành viên ra khỏi nhóm' WHERE "code" = 'WALLETS_MEMBER_KICK'`);

        // 4. Revert roles
        await queryRunner.query(`UPDATE "roles" SET "code" = 'ADMIN_GROUP', "name" = 'Group Admin', "description" = 'Quản trị viên nhóm với quyền quản lý thành viên và thiết lập' WHERE "code" = 'EDITOR'`);
        await queryRunner.query(`UPDATE "roles" SET "code" = 'MEMBER', "name" = 'Group Member', "description" = 'Thành viên cơ bản của nhóm' WHERE "code" = 'VIEWER'`);
        await queryRunner.query(`UPDATE "roles" SET "name" = 'Group Owner', "description" = 'Chủ sở hữu nhóm với toàn quyền quản trị' WHERE "code" = 'OWNER'`);
    }
}
