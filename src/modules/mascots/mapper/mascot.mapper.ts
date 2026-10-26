import { Injectable } from '@nestjs/common';
import { AssetTier } from '../entities/asset-tier.entity';
import { CreateMascotDto } from '../dto/request/create-mascot.dto';
import { MascotTierResponseDto } from '../dto/response/mascot-tier-response.dto';
import { MascotSimpleResponseDto } from '../dto/response/mascot-simple-response.dto';

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
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    };
  }

  toResponse(entity: AssetTier): MascotTierResponseDto {
    return {
      id: entity.id,
      tierName: entity.tierName,
      displayName: entity.displayName || '',
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
      isActive: entity.isActive ?? true,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toSimpleResponse(entity: AssetTier): MascotSimpleResponseDto {
    return {
      id: entity.id,
      tierName: entity.tierName,
      displayName: entity.displayName || '',
      mascotAssetUrl: entity.mascotAssetUrl,
    };
  }
}
