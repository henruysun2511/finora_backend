import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsSysAdminToRolesAndSeedPermissions1790060330389 implements MigrationInterface {
    name = 'AddIsSysAdminToRolesAndSeedPermissions1790060330389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "is_sys_admin" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "roles" SET "is_sys_admin" = true WHERE "code" = 'ADMIN'`);
        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "resource", "action", "description")
            VALUES
                ('USERS_CREATE', 'Tạo người dùng', 'users', 'create', 'Tạo người dùng mới trong hệ thống'),
                ('USERS_READ', 'Xem người dùng', 'users', 'read', 'Xem danh sách và chi tiết người dùng'),
                ('USERS_UPDATE', 'Cập nhật người dùng', 'users', 'update', 'Cập nhật thông tin người dùng'),
                ('USERS_DELETE', 'Xóa người dùng', 'users', 'delete', 'Xóa hoặc vô hiệu hóa người dùng'),
                ('USERS_ASSIGN_ROLE', 'Gán vai trò người dùng', 'users', 'assign_role', 'Gán vai trò hệ thống cho người dùng'),

                ('ROLES_CREATE', 'Tạo vai trò', 'roles', 'create', 'Tạo vai trò mới trong hệ thống'),
                ('ROLES_READ', 'Xem vai trò', 'roles', 'read', 'Xem danh sách và chi tiết vai trò'),
                ('ROLES_UPDATE', 'Cập nhật vai trò', 'roles', 'update', 'Cập nhật thông tin vai trò'),
                ('ROLES_DELETE', 'Xóa vai trò', 'roles', 'delete', 'Xóa vai trò khỏi hệ thống'),
                ('ROLES_ASSIGN_PERMISSION', 'Phân quyền cho vai trò', 'roles', 'assign_permission', 'Gán quyền hạn cho vai trò'),

                ('PERMISSIONS_CREATE', 'Tạo quyền hạn', 'permissions', 'create', 'Tạo quyền hạn mới'),
                ('PERMISSIONS_READ', 'Xem quyền hạn', 'permissions', 'read', 'Xem danh sách quyền hạn'),
                ('PERMISSIONS_UPDATE', 'Cập nhật quyền hạn', 'permissions', 'update', 'Cập nhật thông tin quyền hạn'),
                ('PERMISSIONS_DELETE', 'Xóa quyền hạn', 'permissions', 'delete', 'Xóa quyền hạn khỏi hệ thống'),

                ('PRODUCTS_CREATE', 'Tạo sản phẩm', 'products', 'create', 'Tạo sản phẩm mới'),
                ('PRODUCTS_READ', 'Xem sản phẩm', 'products', 'read', 'Xem danh sách và chi tiết sản phẩm'),
                ('PRODUCTS_UPDATE', 'Cập nhật sản phẩm', 'products', 'update', 'Cập nhật thông tin sản phẩm'),
                ('PRODUCTS_DELETE', 'Xóa sản phẩm', 'products', 'delete', 'Xóa sản phẩm'),

                ('GROUPS_CREATE', 'Tạo nhóm', 'groups', 'create', 'Tạo nhóm mới'),
                ('GROUPS_READ', 'Xem thông tin nhóm', 'groups', 'read', 'Xem danh sách và chi tiết nhóm'),
                ('GROUPS_UPDATE', 'Cập nhật nhóm', 'groups', 'update', 'Cập nhật thông tin nhóm'),
                ('GROUPS_DELETE', 'Xóa nhóm', 'groups', 'delete', 'Giải tán hoặc xóa nhóm'),
                ('GROUPS_TRANSFER_OWNERSHIP', 'Chuyển nhượng quyền nhóm', 'groups', 'transfer_ownership', 'Chuyển nhượng quyền sở hữu nhóm'),
                ('GROUPS_MEMBER_INVITE', 'Mời thành viên nhóm', 'groups', 'invite_member', 'Mời thành viên vào nhóm'),
                ('GROUPS_MEMBER_ASSIGN_ROLE', 'Gán vai trò thành viên nhóm', 'groups', 'assign_member_role', 'Thay đổi vai trò thành viên nhóm'),
                ('GROUPS_MEMBER_KICK', 'Xóa thành viên khỏi nhóm', 'groups', 'kick_member', 'Mời thành viên ra khỏi nhóm'),

                ('SYSTEM_CONFIG_READ', 'Xem cấu hình hệ thống', 'system', 'read_config', 'Xem các tham số cấu hình hệ thống'),
                ('SYSTEM_CONFIG_UPDATE', 'Cập nhật cấu hình hệ thống', 'system', 'update_config', 'Cập nhật các tham số cấu hình hệ thống'),
                ('SYSTEM_AUDIT_VIEW', 'Xem nhật ký kiểm toán', 'system', 'view_audit', 'Xem nhật ký kiểm toán hệ thống')
            ON CONFLICT ("code") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "permissions" WHERE "code" IN (
                'USERS_CREATE', 'USERS_READ', 'USERS_UPDATE', 'USERS_DELETE', 'USERS_ASSIGN_ROLE',
                'ROLES_CREATE', 'ROLES_READ', 'ROLES_UPDATE', 'ROLES_DELETE', 'ROLES_ASSIGN_PERMISSION',
                'PERMISSIONS_CREATE', 'PERMISSIONS_READ', 'PERMISSIONS_UPDATE', 'PERMISSIONS_DELETE',
                'PRODUCTS_CREATE', 'PRODUCTS_READ', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE',
                'GROUPS_CREATE', 'GROUPS_READ', 'GROUPS_UPDATE', 'GROUPS_DELETE', 'GROUPS_TRANSFER_OWNERSHIP',
                'GROUPS_MEMBER_INVITE', 'GROUPS_MEMBER_ASSIGN_ROLE', 'GROUPS_MEMBER_KICK',
                'SYSTEM_CONFIG_READ', 'SYSTEM_CONFIG_UPDATE', 'SYSTEM_AUDIT_VIEW'
            );
        `);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "is_sys_admin"`);
    }
}

