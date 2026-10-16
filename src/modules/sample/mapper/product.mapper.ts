import { Injectable } from '@nestjs/common';
import { Product } from '../entities/product.entity';
import { ProductResponse } from '../dto/response/product.dto';
import { CreateProductDto } from '../dto/request/create-product.dto';
import { UpdateProductDto } from '../dto/request/update-product.dto';

/**
 * Mapper tách biệt Entity và DTO 2 chiều:
 * - toEntity: Chuyển đổi Request DTO sang Entity data.
 * - mergeEntity: Ghi đè cập nhật Update DTO vào Entity có sẵn.
 * - toResponse: Chuyển đổi Entity sang Response DTO (bảo vệ cấu trúc DB, không lộ Entity ra API).
 */
@Injectable()
export class ProductMapper {
  // ── Chiều vào: Request DTO → Entity ─────────────────────────────────────

  toEntity(dto: CreateProductDto): Partial<Product> {
    return {
      name: dto.name,
      sku: dto.sku,
      description: dto.description,
      price: dto.price,
      stock: dto.stock ?? 0,
      category: dto.category ?? 'General',
      status: dto.status,
      isAvailable: dto.isAvailable ?? true,
    };
  }

  mergeEntity(product: Product, dto: UpdateProductDto): Product {
    return Object.assign(product, dto);
  }

  // ── Chiều ra: Entity → Response DTO ────────────────────────────────────

  toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      status: product.status,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  toResponseList(products: Product[]): ProductResponse[] {
    return products.map((p) => this.toResponse(p));
  }
}

