import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('asset_tiers')
export class AssetTier extends BaseEntity {
  @Column({ name: 'tier_name', unique: true, length: 100 })
  @Index('idx_asset_tiers_tier_name')
  tierName: string;

  @Column({
    name: 'min_net_worth',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  minNetWorth: number;

  @Column({
    name: 'max_net_worth',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  maxNetWorth?: number;

  @Column({ name: 'mascot_asset_url', length: 500, nullable: true })
  mascotAssetUrl?: string;

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent?: string;

  @Column({ name: 'system_prompt', type: 'text', nullable: true })
  systemPrompt?: string;

  @Column({ name: 'quotes', type: 'jsonb', default: '[]' })
  quotes?: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
