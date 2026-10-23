import { Injectable } from '@nestjs/common';
import { AssetTier } from '../entities/asset-tier.entity';
import { CreateMascotDto } from '../dto/request/create-mascot.dto';
import { MascotTierResponseDto } from '../dto/response/mascot-tier-response.dto';

@Injectable()
export class MascotMapper {
  toEntity(dto: CreateMascotDto): Partial<AssetTier> {
    return {
      tierName: dto.tierName.toLowerCase().trim(),
      displayName: dto.displayName.trim(),
      minNetWorth: dto.minNetWorth,
      maxNetWorth: dto.maxNetWorth !== undefined ? dto.maxNetWorth : null,
      displayOrder: dto.displayOrder,
      htmlContent: dto.htmlContent,
      systemPrompt: dto.systemPrompt,
      quotes: dto.quotes || [],
      mascotAssetUrl: dto.mascotAssetUrl,
    };
  }

  toResponse(entity: AssetTier): MascotTierResponseDto {
    return {
      id: entity.id,
      tierName: entity.tierName,
      displayName: entity.displayName,
      minNetWorth: Number(entity.minNetWorth),
      maxNetWorth:
        entity.maxNetWorth !== null && entity.maxNetWorth !== undefined
          ? Number(entity.maxNetWorth)
          : undefined,
      displayOrder: entity.displayOrder,
      quotes: entity.quotes || [],
      systemPrompt: entity.systemPrompt || '',
      htmlContent: entity.htmlContent || '',
      mascotAssetUrl: entity.mascotAssetUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
