import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from 'modules/products/products.controller';
import { ProductsService } from 'modules/products/products.service';
import { ProductStatus } from 'modules/products/products.constant';
import { CreateProductDto } from 'modules/products/dto/request/create-product.dto';
import { UpdateProductDto } from 'modules/products/dto/request/update-product.dto';
import { ProductQueryDto } from 'modules/products/dto/request/product-query.dto';
import { ProductResponse } from 'modules/products/dto/response/product.dto';
import { PaginatedResponse } from 'common/response/api-response';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const mockProductResponse: ProductResponse = {
    id: productId,
    name: 'Finora Smart POS',
    sku: 'POS-001',
    description: 'Smart POS terminal device',
    price: 299.99,
    stock: 25,
    category: 'Hardware',
    status: ProductStatus.ACTIVE,
    isAvailable: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  // ============================================
  // SETUP TESTS
  // ============================================
  describe('setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const createDto: CreateProductDto = {
      name: 'Finora Smart POS',
      sku: 'POS-001',
      price: 299.99,
      status: ProductStatus.ACTIVE,
    };

    it('should create product and return ApiResponse.created successfully', async () => {
      // Arrange
      mockProductsService.create.mockResolvedValue(mockProductResponse);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(mockProductsService.create).toHaveBeenCalledWith(createDto);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Tạo sản phẩm mới thành công');
      expect(result.data).toEqual(mockProductResponse);
    });

    it('should handle service errors when creating product', async () => {
      // Arrange
      const error = new Error('Create failed');
      mockProductsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    const query = { page: 1, limit: 10 } as ProductQueryDto;

    it('should return paginated products wrapped in ApiResponse.success', async () => {
      // Arrange
      const paginatedData = PaginatedResponse.of([mockProductResponse], 1, 1, 10);
      mockProductsService.findAll.mockResolvedValue(paginatedData);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(mockProductsService.findAll).toHaveBeenCalledWith(query);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Lấy danh sách sản phẩm thành công');
      expect(result.data).toEqual(paginatedData);
    });

    it('should handle service errors when retrieving product list', async () => {
      // Arrange
      const error = new Error('Query error');
      mockProductsService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(query)).rejects.toThrow(error);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return product detail wrapped in ApiResponse.success', async () => {
      // Arrange
      mockProductsService.findOne.mockResolvedValue(mockProductResponse);

      // Act
      const result = await controller.findOne(productId);

      // Assert
      expect(mockProductsService.findOne).toHaveBeenCalledWith(productId);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Lấy thông tin chi tiết sản phẩm thành công');
      expect(result.data).toEqual(mockProductResponse);
    });

    it('should handle service errors when finding product by id', async () => {
      // Arrange
      const error = new Error('Product not found');
      mockProductsService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(productId)).rejects.toThrow(error);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    const updateDto: UpdateProductDto = { price: 349.99 };
    const updatedResponse = { ...mockProductResponse, price: 349.99 };

    it('should update product and return ApiResponse.success', async () => {
      // Arrange
      mockProductsService.update.mockResolvedValue(updatedResponse);

      // Act
      const result = await controller.update(productId, updateDto);

      // Assert
      expect(mockProductsService.update).toHaveBeenCalledWith(productId, updateDto);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cập nhật sản phẩm thành công');
      expect(result.data).toEqual(updatedResponse);
    });

    it('should handle service errors when updating product', async () => {
      // Arrange
      const error = new Error('Update error');
      mockProductsService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(productId, updateDto)).rejects.toThrow(error);
    });
  });

  // ============================================
  // REMOVE (SOFT DELETE)
  // ============================================
  describe('remove', () => {
    it('should remove product and return ApiResponse.noContent', async () => {
      // Arrange
      mockProductsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(productId);

      // Assert
      expect(mockProductsService.remove).toHaveBeenCalledWith(productId);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Xóa sản phẩm thành công');
      expect(result.data).toBeNull();
    });

    it('should handle service errors when removing product', async () => {
      // Arrange
      const error = new Error('Remove error');
      mockProductsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(productId)).rejects.toThrow(error);
    });
  });
});
