import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import type { WalletMember } from './wallet-member.entity';

@Entity('wallets')
export class Wallet extends BaseEntity {
  @Column({ name: 'owner_id', type: 'uuid' })
  @Index('idx_wallets_owner_id')
  ownerId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 255 })
  icon?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'default_currency', length: 3, default: 'VND' })
  defaultCurrency: string;

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany('WalletMember', 'wallet')
  members: WalletMember[];

  @OneToMany('Account', 'wallet')
  accounts: any[];
}
