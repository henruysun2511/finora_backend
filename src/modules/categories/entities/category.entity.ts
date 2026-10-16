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
import type { Transaction } from '../../transactions/entities/transaction.entity';
import type { Budget } from '../../budgets/entities/budget.entity';
import type { RecurringTransaction } from '../../recurring-transactions/entities/recurring-transaction.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @Index()
  parentId?: string;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.EXPENSE,
  })
  type: CategoryType;

  @Column({ nullable: true, length: 10 })
  color?: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @OneToMany('Transaction', 'category')
  transactions: Transaction[];

  @OneToMany('Budget', 'category')
  budgets: Budget[];

  @OneToMany('RecurringTransaction', 'category')
  recurringTransactions: RecurringTransaction[];
}
