import { execSync } from 'child_process';

const rawArgs = process.argv.slice(2);
let migrationName = '';
for (const arg of rawArgs) {
  if (arg.startsWith('--name=')) {
    migrationName = arg.replace('--name=', '').trim();
    break;
  } else if (!arg.startsWith('-')) {
    migrationName = arg.trim();
    break;
  }
}

if (!migrationName) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  migrationName = `ManualMigration_${timestamp}`;
  console.log(`ℹ️ Không có tên được chỉ định, tự động đặt tên: ${migrationName}`);
}

migrationName = migrationName.replace(/[^a-zA-Z0-9_]/g, '');

const migrationPath = `src/database/migrations/${migrationName}`;

console.log(`📝 Đang khởi tạo file migration trống: ${migrationName}...`);
const command = `npx typeorm-ts-node-commonjs migration:create ${migrationPath}`;

try {
  execSync(command, { stdio: 'inherit' });
  console.log(`\n🎉 Tạo file migration trống thành công tại ${migrationPath}`);
} catch (err: any) {
  process.exit(1);
}
