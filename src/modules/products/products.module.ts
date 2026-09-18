import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductRepository } from './repository/product.repository';
import { ProductMapper } from './mapper/product.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository, ProductMapper],
  exports: [ProductsService],
})
export class ProductsModule {}
