import { AppDataSource } from '../data-source';
import { MASCOT_TIERS_SEED_DATA } from './mascot-tiers.seed';

async function runMascotSeed() {
  console.log('--- Bắt đầu chạy Seed Mascot Tiers ---');
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Kiểm tra và bổ sung cột html_content, system_prompt, quotes vào bảng asset_tiers nếu chưa có
    console.log('1. Đang kiểm tra schema bảng asset_tiers...');
    await queryRunner.query(`
      ALTER TABLE "asset_tiers" 
      ADD COLUMN IF NOT EXISTS "html_content" text,
      ADD COLUMN IF NOT EXISTS "system_prompt" text,
      ADD COLUMN IF NOT EXISTS "quotes" jsonb DEFAULT '[]'::jsonb;
    `);

    // 2. Chèn / Cập nhật dữ liệu của 7 mascot
    console.log('2. Đang thêm/cập nhật 7 mascot AI...');
    for (const item of MASCOT_TIERS_SEED_DATA) {
      await queryRunner.query(
        `
        INSERT INTO "asset_tiers" (
          "tier_name", 
          "display_name", 
          "min_net_worth", 
          "max_net_worth", 
          "display_order", 
          "quotes", 
          "system_prompt", 
          "html_content"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("tier_name") DO UPDATE SET
          "display_name" = EXCLUDED."display_name",
          "min_net_worth" = EXCLUDED."min_net_worth",
          "max_net_worth" = EXCLUDED."max_net_worth",
          "display_order" = EXCLUDED."display_order",
          "quotes" = EXCLUDED."quotes",
          "system_prompt" = EXCLUDED."system_prompt",
          "html_content" = EXCLUDED."html_content",
          "updated_at" = now();
      `,
        [
          item.tierName,
          item.displayName,
          item.minNetWorth,
          item.maxNetWorth,
          item.displayOrder,
          JSON.stringify(item.quotes),
          item.systemPrompt,
          item.htmlContent,
        ],
      );
      console.log(` -> Đã nạp thành công: ${item.displayName} (${item.tierName})`);
    }

    console.log('=== SEED HOÀN TẤT THÀNH CÔNG 7 MASCOT! ===');
  } catch (error) {
    console.error('Lỗi khi seed mascot tiers:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

runMascotSeed();
