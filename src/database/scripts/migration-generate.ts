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
  migrationName = `AutoMigration_${timestamp}`;
  console.log(
    `ℹ️ Không có tên được chỉ định, tự động đặt tên: ${migrationName}`,
  );
}

migrationName = migrationName.replace(/[^a-zA-Z0-9_]/g, '');

const migrationPath = `src/database/migrations/${migrationName}`;
const dataSourcePath = `src/database/data-source.ts`;

console.log(
  `🔍 Đang so khớp Entities với Database để tạo bản migration: ${migrationName}...`,
);
const command = `npx typeorm-ts-node-commonjs migration:generate ${migrationPath} -d ${dataSourcePath}`;

try {
  const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  console.log(stdout);
  console.log(`\n🎉 Tạo bản migration thành công tại ${migrationPath}`);
} catch (err: unknown) {
  const error = err as {
    stdout?: Buffer | string;
    stderr?: Buffer | string;
    message?: string;
  };
  const output =
    (error.stdout ? error.stdout.toString() : '') +
    (error.stderr ? error.stderr.toString() : '');
  if (output.includes('No changes in database schema were found')) {
    console.log(
      `\nℹ️ Database đã khớp hoàn toàn với Entities. Không có thay đổi nào để tạo migration mới.`,
    );
  } else {
    console.error(output || error.message);
    console.error(`\n❌ Quá trình tạo migration gặp lỗi.`);
    process.exit(1);
  }
}
