import { AppDataSource } from '../data-source';
import {
  SYSTEM_PERMISSIONS,
  ADMIN_EXCLUSIVE_PERMISSIONS,
  USER_DEFAULT_PERMISSIONS,
} from '../../common/constants/permission.constant';

export async function seedDefaultRolesAndPermissions() {
  console.log('========================================================');
  console.log('🚀 KHỞI TẠO ROLES & PHÂN QUYỀN MẶC ĐỊNH CHO HỆ THỐNG 🚀');
  console.log('========================================================');

  const isAlreadyInitialized = AppDataSource.isInitialized;
  if (!isAlreadyInitialized) {
    await AppDataSource.initialize();
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Tạo vai trò USER và ADMIN
    console.log('[1/4] Khởi tạo các vai trò hệ thống (USER, ADMIN)...');
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "code", "name", "description", "is_active", "is_sys_admin")
      VALUES
        (uuid_generate_v4(), 'USER', 'Người dùng thông thường', 'Người dùng tiêu chuẩn với quyền thao tác tài chính cá nhân và nhóm', true, false),
        (uuid_generate_v4(), 'ADMIN', 'Quản trị viên', 'Toàn quyền quản trị hệ thống', true, true)
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "is_active" = true;
    `);

    // 2. Đảm bảo đầy đủ danh mục permissions trong bảng permissions
    console.log('[2/4] Đồng bộ danh mục quyền (permissions)...');
    const allPermissions = Object.values(SYSTEM_PERMISSIONS);
    for (const code of allPermissions) {
      const parts = code.split('_');
      const resource = parts[0].toLowerCase();
      const action = parts.slice(1).join('_').toLowerCase();

      await queryRunner.query(
        `
        INSERT INTO "permissions" ("id", "code", "name", "resource", "action", "description")
        VALUES (uuid_generate_v4(), $1, $1, $2, $3, $1)
        ON CONFLICT ("code") DO NOTHING;
      `,
        [code, resource, action],
      );
    }

    // 3. Gán quyền cho role USER
    console.log('[3/4] Gán quyền mặc định cho vai trò USER...');
    for (const permCode of USER_DEFAULT_PERMISSIONS) {
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
        SELECT uuid_generate_v4(), r.id, p.id
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE r.code = 'USER' AND p.code = '${permCode}'
        ON CONFLICT ("role_id", "permission_id") DO NOTHING;
      `);
    }

    // Gán toàn bộ quyền cho role ADMIN
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
      SELECT uuid_generate_v4(), r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.code = 'ADMIN'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);

    // 4. Gán vai trò USER cho những người dùng hiện tại chưa có role
    console.log('[4/4] Gán vai trò USER cho các tài khoản người dùng chưa có vai trò...');
    await queryRunner.query(`
      INSERT INTO "user_roles" ("id", "user_id", "role_id")
      SELECT uuid_generate_v4(), u.id, r.id
      FROM "users" u
      CROSS JOIN "roles" r
      WHERE r.code = 'USER'
        AND NOT EXISTS (
          SELECT 1 FROM "user_roles" ur WHERE ur.user_id = u.id
        )
      ON CONFLICT ("user_id", "role_id") DO NOTHING;
    `);

    await queryRunner.commitTransaction();
    console.log('✅ Hoàn tất khởi tạo vai trò và phân quyền mặc định thành công!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Lỗi khi khởi tạo roles & permissions:', error);
    throw error;
  } finally {
    await queryRunner.release();
    if (!isAlreadyInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  seedDefaultRolesAndPermissions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

