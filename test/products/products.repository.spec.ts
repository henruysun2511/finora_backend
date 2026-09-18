import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProductRepository } from 'modules/products/repository/product.repository';
import { Product } from 'modules/products/entities/product.entity';
import { ProductStatus } from 'modules/products/products.constant';
import { ProductQueryDto } from 'modules/products/dto/request/product-query.dto';
import { SortOrder } from 'common/enums/sort-order.enum';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let typeOrmRepo: Repository<Product>;

  const mockProduct: Product = {
    id: 'prod-uuid-1',
    name: 'Sample Terminal',
    sku: 'ST-001',
    description: 'A sample terminal',
    price: 150,
    stock: 10,
    category: 'POS',
    status: ProductStatus.ACTIVE,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Product;

  const mockTypeOrmRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        {
          provide: getRepositoryToken(Product),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
    typeOrmRepo = module.get(getRepositoryToken(Product));

    jest.clearAllMocks();
  });

  // ============================================
  // SETUP TESTS
  // ============================================
  describe('setup', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
      expect(typeOrmRepo).toBeDefined();
    });
  });

  // ============================================
  // FIND BY ID
  // ============================================
  describe('findById', () => {
    it('should find product by id successfully', async () => {
      // Arrange
      mockTypeOrmRepo.findOne.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.findById('prod-uuid-1');

      // Assert
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product with id is not found', async () => {
      // Arrange
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should throw error when database fails', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockTypeOrmRepo.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findById('prod-uuid-1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // ============================================
  // FIND BY SKU
  // ============================================
  describe('findBySku', () => {
    it('should find product by sku successfully', async () => {
      // Arrange
      mockTypeOrmRepo.findOne.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.findBySku('ST-001');

      // Assert
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { sku: 'ST-001' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product with sku is not found', async () => {
      // Arrange
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findBySku('NON-EXISTENT');

      // Assert
      expect(result).toBeNull();
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { sku: 'NON-EXISTENT' },
      });
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const error = new Error('Query error');
      mockTypeOrmRepo.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findBySku('ST-001')).rejects.toThrow(
        'Query error',
      );
    });
  });

  // ============================================
  // SAVE
  // ============================================
  describe('save', () => {
    it('should save product entity successfully', async () => {
      // Arrange
      mockTypeOrmRepo.save.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.save(mockProduct);

      // Assert
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw error when save fails', async () => {
      // Arrange
      const error = new Error('Save failed');
      mockTypeOrmRepo.save.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.save(mockProduct)).rejects.toThrow('Save failed');
    });
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    it('should delegate entity creation to typeOrmRepo.create', () => {
      // Arrange
      const data = { name: 'Sample Terminal', sku: 'ST-001' };
      mockTypeOrmRepo.create.mockReturnValue(mockProduct);

      // Act
      const result = repository.create(data);

      // Assert
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockProduct);
    });
  });

  // ============================================
  // SOFT DELETE
  // ============================================
  describe('softDelete', () => {
    it('should soft delete product successfully', async () => {
      // Arrange
      mockTypeOrmRepo.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // Act
      const result = await repository.softDelete('prod-uuid-1');

      // Assert
      expect(mockTypeOrmRepo.softDelete).toHaveBeenCalledWith('prod-uuid-1');
      expect(result).toEqual({ affected: 1, raw: [], generatedMaps: [] });
    });

    it('should throw error when soft delete fails', async () => {
      // Arrange
      const error = new Error('Delete constraint failure');
      mockTypeOrmRepo.softDelete.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.softDelete('prod-uuid-1')).rejects.toThrow(
        'Delete constraint failure',
      );
    });
  });

  // ============================================
  // FIND PAGINATED (QUERY BUILDER)
  // ============================================
  describe('findPaginated', () => {
    it('should build queries with keyword, category, status, price range, and sort fields', async () => {
      // Arrange
      const qbMock: Partial<SelectQueryBuilder<Product>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };

      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qbMock);

      const query: ProductQueryDto = {
        page: 2,
        limit: 10,
        skip: 10,
        keyword: 'Terminal',
        category: 'POS',
        status: ProductStatus.ACTIVE,
        minPrice: 100,
        maxPrice: 200,
        isAvailable: true,
        sortBy: 'price',
        sortOrder: SortOrder.ASC,
      };

      // Act
      const [products, total] = await repository.findPaginated(query);

      // Assert
      expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith(
        'product',
      );
      expect(qbMock.where).toHaveBeenCalledWith('product.deletedAt IS NULL');
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :kw OR product.sku ILIKE :kw OR product.description ILIKE :kw)',
        { kw: '%Terminal%' },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'POS' },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith('product.status = :status', {
        status: ProductStatus.ACTIVE,
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 100 },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 200 },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'product.isAvailable = :isAvailable',
        { isAvailable: true },
      );
      expect(qbMock.orderBy).toHaveBeenCalledWith('product.price', 'ASC');
      expect(qbMock.skip).toHaveBeenCalledWith(10);
      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(products).toEqual([mockProduct]);
      expect(total).toBe(1);
    });

    it('should default sort to createdAt DESC when sortBy is invalid or not provided', async () => {
      // Arrange
      const qbMock: Partial<SelectQueryBuilder<Product>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qbMock);

      const query: ProductQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        sortBy: 'invalid_field_injection',
      };

      // Act
      await repository.findPaginated(query);

      // Assert
      expect(qbMock.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should throw error when query execution fails in QueryBuilder', async () => {
      // Arrange
      const qbMock: Partial<SelectQueryBuilder<Product>> = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockRejectedValue(new Error('QueryBuilder DB error')),
      };

      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qbMock);

      const query: ProductQueryDto = { page: 1, limit: 10, skip: 0 };

      // Act & Assert
      await expect(repository.findPaginated(query)).rejects.toThrow(
        'QueryBuilder DB error',
      );
    });
  });
});
