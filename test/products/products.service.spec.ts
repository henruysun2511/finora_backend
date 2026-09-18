import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from 'modules/products/products.service';
import { ProductRepository } from 'modules/products/repository/product.repository';
import { ProductMapper } from 'modules/products/mapper/product.mapper';
import { ProductStatus } from 'modules/products/products.constant';
import { ProductSkuAlreadyExistsException } from 'modules/products/exceptions/product.exception';
import { AppError } from 'common/errors/app.error';
import { CreateProductDto } from 'modules/products/dto/request/create-product.dto';
import { UpdateProductDto } from 'modules/products/dto/request/update-product.dto';
import { ProductQueryDto } from 'modules/products/dto/request/product-query.dto';
import { Product } from 'modules/products/entities/product.entity';
import { ProductResponse } from 'modules/products/dto/response/product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: ProductRepository;
  let mapper: ProductMapper;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');

  const mockProductRepository = {
    findById: jest.fn(),
    findBySku: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findPaginated: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductEntity: Product = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Test Product',
    sku: 'SKU-001',
    description: 'A test product description',
    price: 99.99,
    stock: 50,
    category: 'Electronics',
    status: ProductStatus.ACTIVE,
    isAvailable: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
  } as Product;

  const mockProductResponse: ProductResponse = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Test Product',
    sku: 'SKU-001',
    description: 'A test product description',
    price: 99.99,
    stock: 50,
    category: 'Electronics',
    status: ProductStatus.ACTIVE,
    isAvailable: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        ProductMapper,
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<ProductRepository>(ProductRepository);
    mapper = module.get<ProductMapper>(ProductMapper);

    jest.clearAllMocks();
  });

  // ============================================
  // SETUP TESTS
  // ============================================
  describe('setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(repository).toBeDefined();
      expect(mapper).toBeDefined();
    });
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const createDto: CreateProductDto = {
      name: 'Test Product',
      sku: 'SKU-001',
      description: 'A test product description',
      price: 99.99,
      stock: 50,
      category: 'Electronics',
      status: ProductStatus.ACTIVE,
      isAvailable: true,
    };

    it('should create product successfully when SKU is unique', async () => {
      // Arrange
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(mockProductEntity);
      mockProductRepository.save.mockResolvedValue(mockProductEntity);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockProductResponse);
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(
        createDto.sku,
      );
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        mapper.toEntity(createDto),
      );
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        mockProductEntity,
      );
    });

    it('should throw ProductSkuAlreadyExistsException when SKU already exists', async () => {
      // Arrange
      mockProductRepository.findBySku.mockResolvedValue(mockProductEntity);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        ProductSkuAlreadyExistsException,
      );
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(
        createDto.sku,
      );
      expect(mockProductRepository.create).not.toHaveBeenCalled();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors on create/save', async () => {
      // Arrange
      const error = new Error('Database error on save');
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(mockProductEntity);
      mockProductRepository.save.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        'Database error on save',
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return paginated products successfully', async () => {
      // Arrange
      const query: ProductQueryDto = {
        page: 1,
        limit: 10,
        keyword: 'Test',
        skip: 0,
      };
      const products = [mockProductEntity];
      const total = 1;
      mockProductRepository.findPaginated.mockResolvedValue([products, total]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockProductResponse);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
      expect(mockProductRepository.findPaginated).toHaveBeenCalledWith(query);
    });

    it('should handle repository errors on findPaginated', async () => {
      // Arrange
      const query: ProductQueryDto = { page: 1, limit: 10, skip: 0 };
      const error = new Error('Query execution failed');
      mockProductRepository.findPaginated.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findAll(query)).rejects.toThrow(
        'Query execution failed',
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should return product response when product exists', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(mockProductEntity);

      // Act
      const result = await service.findOne(productId);

      // Assert
      expect(result).toEqual(mockProductResponse);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
    });

    it('should throw AppError 404 when product is not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(productId)).rejects.toThrow(AppError);
      await expect(service.findOne(productId)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
    });

    it('should handle repository errors on findById', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockProductRepository.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findOne(productId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should update product successfully when changing fields without changing SKU', async () => {
      // Arrange
      const currentProduct = { ...mockProductEntity };
      const updateDto: UpdateProductDto = {
        name: 'Updated Product Name',
        price: 120,
      };
      const updatedProduct = {
        ...mockProductEntity,
        name: 'Updated Product Name',
        price: 120,
      };

      mockProductRepository.findById.mockResolvedValue(currentProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.update(productId, updateDto);

      // Assert
      expect(result.name).toBe('Updated Product Name');
      expect(result.price).toBe(120);
      expect(mockProductRepository.findBySku).not.toHaveBeenCalled();
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    it('should update product successfully when new SKU is unique', async () => {
      // Arrange
      const currentProduct = { ...mockProductEntity, sku: 'SKU-001' };
      const updateDto: UpdateProductDto = { sku: 'SKU-NEW' };
      const updatedProduct = { ...mockProductEntity, sku: 'SKU-NEW' };

      mockProductRepository.findById.mockResolvedValue(currentProduct);
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.update(productId, updateDto);

      // Assert
      expect(result.sku).toBe('SKU-NEW');
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('SKU-NEW');
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    it('should throw AppError 404 when product to update is not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);
      const updateDto: UpdateProductDto = { name: 'Updated Product' };

      // Act & Assert
      await expect(service.update(productId, updateDto)).rejects.toThrow(
        AppError,
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ProductSkuAlreadyExistsException when new SKU is already taken', async () => {
      // Arrange
      const currentProduct = { ...mockProductEntity, sku: 'SKU-001' };
      const conflictingProduct = {
        ...mockProductEntity,
        id: 'other-uuid',
        sku: 'SKU-EXISTING',
      };
      const updateDto: UpdateProductDto = { sku: 'SKU-EXISTING' };

      mockProductRepository.findById.mockResolvedValue(currentProduct);
      mockProductRepository.findBySku.mockResolvedValue(conflictingProduct);

      // Act & Assert
      await expect(service.update(productId, updateDto)).rejects.toThrow(
        ProductSkuAlreadyExistsException,
      );
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(
        'SKU-EXISTING',
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors on save during update', async () => {
      // Arrange
      const currentProduct = { ...mockProductEntity };
      const updateDto: UpdateProductDto = { name: 'New Name' };
      const error = new Error('Database transaction error');

      mockProductRepository.findById.mockResolvedValue(currentProduct);
      mockProductRepository.save.mockRejectedValue(error);

      // Act & Assert
      await expect(service.update(productId, updateDto)).rejects.toThrow(
        'Database transaction error',
      );
    });
  });

  // ============================================
  // REMOVE (SOFT DELETE)
  // ============================================
  describe('remove', () => {
    const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should soft delete product successfully when product exists', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(mockProductEntity);
      mockProductRepository.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // Act
      await service.remove(productId);

      // Assert
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.softDelete).toHaveBeenCalledWith(productId);
    });

    it('should throw AppError 404 when product to remove is not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(productId)).rejects.toThrow(AppError);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should handle repository errors on softDelete', async () => {
      // Arrange
      const error = new Error('Soft delete query failed');
      mockProductRepository.findById.mockResolvedValue(mockProductEntity);
      mockProductRepository.softDelete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.remove(productId)).rejects.toThrow(
        'Soft delete query failed',
      );
    });
  });
});
