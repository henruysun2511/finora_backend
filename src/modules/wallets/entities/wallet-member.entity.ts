import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Wallet } from './wallet.entity';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../../common/enums/wallet-member-role.enum';

@Entity('wallet_members')
@Unique(['walletId', 'userId'])
export class WalletMember extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index('idx_wallet_members_wallet_id')
  walletId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_wallet_members_user_id')
  userId: string;

  @Column({
    type: 'enum',
    enum: WalletMemberRole,
    default: WalletMemberRole.VIEWER,
  })
  role: WalletMemberRole;

  @Column({
    type: 'enum',
    enum: WalletMemberStatus,
    default: WalletMemberStatus.ACCEPTED,
  })
  status: WalletMemberStatus;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt?: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => User, (user) => user.walletMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
