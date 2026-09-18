import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../products.constant';

export class ProductResponse {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Bàn phím cơ không dây Finora Pro' })
  name: string;

  @ApiProperty({ example: 'KB-FINORA-PRO-01' })
  sku: string;

  @ApiPropertyOptional({ example: 'Bàn phím cơ Bluetooth 3 chế độ kết nối' })
  description?: string;

  @ApiProperty({ example: 1450000 })
  price: number;

  @ApiProperty({ example: 50 })
  stock: number;

  @ApiProperty({ example: 'Phụ kiện máy tính' })
  category: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ example: '2026-09-18T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-18T08:00:00.000Z' })
  updatedAt: Date;
}
