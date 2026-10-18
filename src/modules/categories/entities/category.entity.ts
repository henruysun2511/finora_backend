import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CategoryType } from '../../../common/enums/category-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.EXPENSE,
  })
  type: CategoryType;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @Index('idx_categories_parent_id')
  parentId?: string;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index('idx_categories_user_id')
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_system', default: false })
  isDefault: boolean;

  @OneToMany('Transaction', 'category')
  transactions: any[];

  @OneToMany('Budget', 'category')
  budgets: any[];
}

// Re-export alias để tương thích toàn bộ DTO, Mapper, Repository
export { Category as CategoryEntity, CategoryType };