import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { ProductQueryDto } from './dto/request/product-query.dto';
import { ProductResponse } from './dto/response/product.dto';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @SwaggerDoc({
    summary: 'Tạo sản phẩm mới',
    description: 'Thêm mới một sản phẩm vào kho, tự động kiểm tra tính duy nhất của SKU.',
    bodyType: CreateProductDto,
    responseType: ProductResponse,
    status: 201,
  })
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return ApiResponse.created(data, 'Tạo sản phẩm mới thành công');
  }

  @Get()
  @SwaggerDoc({
    summary: 'Danh sách sản phẩm (Phân trang, Lọc & Sắp xếp)',
    description: 'Hỗ trợ tìm kiếm từ khóa, lọc theo danh mục, trạng thái, khoảng giá, mở bán và sắp xếp nhiều trường.',
    responseType: ProductResponse,
    isArray: true,
  })
  async findAll(@Query() query: ProductQueryDto) {
    const data = await this.productsService.findAll(query);
    return ApiResponse.success(data, 'Lấy danh sách sản phẩm thành công');
  }

  @Get(':id')
  @SwaggerDoc({
    summary: 'Chi tiết sản phẩm',
    description: 'Lấy thông tin chi tiết một sản phẩm theo UUID.',
    responseType: ProductResponse,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return ApiResponse.success(data, 'Lấy thông tin chi tiết sản phẩm thành công');
  }

  @Patch(':id')
  @SwaggerDoc({
    summary: 'Cập nhật thông tin sản phẩm',
    description: 'Cập nhật một phần hoặc toàn bộ thông tin sản phẩm theo UUID.',
    bodyType: UpdateProductDto,
    responseType: ProductResponse,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, dto);
    return ApiResponse.success(data, 'Cập nhật sản phẩm thành công');
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: 'Xóa mềm sản phẩm',
    description: 'Đánh dấu thời gian xóa mềm sản phẩm (soft delete), dữ liệu không bị xóa vật lý khỏi database.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
    return ApiResponse.noContent('Xóa sản phẩm thành công');
  }
}
