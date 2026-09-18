import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductStatus } from '../products.constant';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 200 })
  @Index()
  name: string;

  @Column({ unique: true, length: 100 })
  @Index()
  sku: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ length: 100, default: 'General' })
  @Index()
  category: string;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;
}
