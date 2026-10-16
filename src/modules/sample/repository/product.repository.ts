import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductQueryDto } from '../dto/request/product-query.dto';
import { PRODUCTS_CONSTANTS } from '../products.constant';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { sku } });
  }

  save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  create(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  async findPaginated(query: ProductQueryDto): Promise<[Product[], number]> {
    const qb = this.repo.createQueryBuilder('product')
      .where('product.deletedAt IS NULL');

    // 1. Tìm kiếm từ khóa (name, sku, description)
    if (query.keyword && query.keyword.trim() !== '') {
      qb.andWhere(
        '(product.name ILIKE :kw OR product.sku ILIKE :kw OR product.description ILIKE :kw)',
        { kw: `%${query.keyword.trim()}%` },
      );
    }

    // 2. Lọc theo danh mục
    if (query.category && query.category.trim() !== '') {
      qb.andWhere('product.category = :category', { category: query.category.trim() });
    }

    // 3. Lọc theo trạng thái
    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    // 4. Lọc theo khoảng giá
    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    // 5. Lọc theo trạng thái mở bán
    if (query.isAvailable !== undefined) {
      qb.andWhere('product.isAvailable = :isAvailable', { isAvailable: query.isAvailable });
    }

    // 6. Xử lý sắp xếp (bảo vệ trường sort hợp lệ)
    const allowedSortFields: readonly string[] = PRODUCTS_CONSTANTS.ALLOWED_SORT_FIELDS;
    const sortField = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';

    return qb
      .orderBy(`product.${sortField}`, query.sortOrder ?? 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
  }

  softDelete(id: string): Promise<any> {
    return this.repo.softDelete(id);
  }
}
