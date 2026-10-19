import { MigrationInterface, QueryRunner } from 'typeorm';
import { MASCOT_TIERS_SEED_DATA } from '../seeds/mascot-tiers.seed';

export class AddHtmlContentAndSeedMascotTiers1797200000000
  implements MigrationInterface
{
  name = 'AddHtmlContentAndSeedMascotTiers1797200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asset_tiers" 
      ADD COLUMN IF NOT EXISTS "html_content" text,
      ADD COLUMN IF NOT EXISTS "system_prompt" text,
      ADD COLUMN IF NOT EXISTS "quotes" jsonb DEFAULT '[]'::jsonb;
    `);

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
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asset_tiers" 
      DROP COLUMN IF EXISTS "html_content",
      DROP COLUMN IF EXISTS "system_prompt",
      DROP COLUMN IF EXISTS "quotes";
    `);
  }
}
