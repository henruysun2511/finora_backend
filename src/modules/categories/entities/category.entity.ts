import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

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

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @OneToMany('Transaction', 'category')
  transactions: any[];

  @OneToMany('Budget', 'category')
  budgets: any[];
}
