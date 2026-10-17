import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Wallet } from '../entities/wallet.entity';
import { WalletMemberStatus } from '../../../common/enums/wallet-member-role.enum';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  create(data: Partial<Wallet>): Wallet {
    return this.repo.create(data);
  }

  async save(wallet: Wallet, manager?: EntityManager): Promise<Wallet> {
    if (manager) {
      return manager.save(Wallet, wallet);
    }

    return this.repo.save(wallet);
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['owner'],
    });
  }

  async findByNameAndOwnerId(
    name: string,
    ownerId: string,
  ): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { name, ownerId },
    });
  }

  async findWalletsByUserId(userId: string): Promise<Wallet[]> {
    return this.repo
      .createQueryBuilder('wallet')
      .innerJoin(
        'wallet.members',
        'member',
        `member.userId = :userId
         AND member.status = :status
         AND member.deletedAt IS NULL`,
        {
          userId,
          status: WalletMemberStatus.ACCEPTED,
        },
      )
      .leftJoinAndSelect('wallet.owner', 'owner')
      .where('wallet.deletedAt IS NULL')
      .orderBy('wallet.createdAt', 'DESC')
      .getMany();
  }

  async findWalletsByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<[Wallet[], number]> {
    return this.repo
      .createQueryBuilder('wallet')
      .innerJoin(
        'wallet.members',
        'member',
        `member.userId = :userId
         AND member.status = :status
         AND member.deletedAt IS NULL`,
        {
          userId,
          status: WalletMemberStatus.ACCEPTED,
        },
      )
      .leftJoinAndSelect('wallet.owner', 'owner')
      .where('wallet.deletedAt IS NULL')
      .orderBy('wallet.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async softDeleteById(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
