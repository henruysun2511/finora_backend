import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('asset_tiers')
export class AssetTier extends BaseEntity {
  @Column({ name: 'tier_name', unique: true, length: 100 })
  @Index()
  tierName: string;

  @Column({
    name: 'min_net_worth',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  minNetWorth: number;

  @Column({
    name: 'max_net_worth',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  maxNetWorth?: number;

  @Column({ name: 'mascot_asset_url', length: 500, nullable: true })
  mascotAssetUrl?: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;
}
