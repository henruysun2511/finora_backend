import { Injectable } from '@nestjs/common';
import { ProductRepository } from './repository/product.repository';
import { ProductMapper } from './mapper/product.mapper';
import { notFound } from '../../common/errors/app.error';
import { ProductSkuAlreadyExistsException } from './exceptions/product.exception';
import { PaginatedResponse } from '../../common/response/api-response';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { ProductQueryDto } from './dto/request/product-query.dto';
import { ProductResponse } from './dto/response/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly productMapper: ProductMapper,
  ) {}

  // ── CREATE ───────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const existing = await this.productRepo.findBySku(dto.sku);
    if (existing) {
      throw new ProductSkuAlreadyExistsException(dto.sku);
    }

    const productData = this.productMapper.toEntity(dto);
    const product = this.productRepo.create(productData);

    const saved = await this.productRepo.save(product);
    return this.productMapper.toResponse(saved);
  }

  // ── LIST (Phân trang + Lọc + Sắp xếp) ────────────────────────────────────

  async findAll(
    query: ProductQueryDto,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const [products, total] = await this.productRepo.findPaginated(query);
    return PaginatedResponse.of(
      this.productMapper.toResponseList(products),
      total,
      query.page,
      query.limit,
    );
  }

  // ── DETAIL ───────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<ProductResponse> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw notFound('sản phẩm');
    }
    return this.productMapper.toResponse(product);
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw notFound('sản phẩm');
    }

    // Nếu thay đổi SKU, kiểm tra trùng lặp
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productRepo.findBySku(dto.sku);
      if (existing) {
        throw new ProductSkuAlreadyExistsException(dto.sku);
      }
    }

    this.productMapper.mergeEntity(product, dto);
    const updated = await this.productRepo.save(product);
    return this.productMapper.toResponse(updated);
  }

  // ── DELETE (Soft Delete) ──────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw notFound('sản phẩm');
    }
    await this.productRepo.softDelete(id);
  }
}
