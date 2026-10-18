// src/modules/accounts/entities/account-balance-adjustment.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Account } from './account.entity';
import { BalanceDirection } from '../../../modules/accounts/enums/balance-direction.enum';
import { decimalTransformer } from '../../../common/utils/decimal.transformer';

@Entity('account_balance_adjustments')
@Index('uq_acc_adj_account_idempotency', ['accountId', 'idempotencyKey'], { unique: true })
export class AccountBalanceAdjustment extends BaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  @Index('idx_acc_adj_account_id')
  accountId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: BalanceDirection })
  direction: BalanceDirection;

  // Giá trị tuyệt đối (> 0), chiều tăng/giảm nằm ở direction
  @Column({ type: 'decimal', precision: 19, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({
    name: 'balance_before',
    type: 'decimal',
    precision: 19,
    scale: 2,
    transformer: decimalTransformer,
  })
  balanceBefore: number;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 19,
    scale: 2,
    transformer: decimalTransformer,
  })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100 })
  idempotencyKey: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;
}