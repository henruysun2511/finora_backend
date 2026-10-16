import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PhotoType } from '../../../common/enums/photo-type.enum';
import { Transaction } from './transaction.entity';

@Entity('transaction_photos')
export class TransactionPhoto extends BaseEntity {
  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index()
  transactionId: string;

  @ManyToOne(() => Transaction, (tx) => tx.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'photo_url', length: 500 })
  photoUrl: string;

  @Column({
    type: 'enum',
    enum: PhotoType,
    default: PhotoType.RECEIPT,
  })
  type: PhotoType;

  @Column({ name: 'is_cover', default: false })
  isCover: boolean;
}
