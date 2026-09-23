import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WalletRole } from '../../../common/enums/wallet-role.enum';
import { User } from '../../users/entities/user.entity';
import { Wallet } from './wallet.entity';

@Entity('wallet_members')
@Unique(['walletId', 'userId'])
export class WalletMember extends BaseEntity {
  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.walletMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: WalletRole,
    default: WalletRole.VIEWER,
  })
  role: WalletRole;

  @Column({
    name: 'joined_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt: Date;
}
