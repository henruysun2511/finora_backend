import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './repository/category.repository';
import { CategoryMapper } from './mapper/category.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryRepository,
    CategoryMapper,
  ],
  exports: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}
