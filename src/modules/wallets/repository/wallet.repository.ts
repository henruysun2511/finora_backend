import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  create(data: Partial<Wallet>): Wallet {
    return this.repo.create(data);
  }

  save(wallet: Wallet, manager?: EntityManager): Promise<Wallet> {
    if (manager) {
      return manager.save(Wallet, wallet);
    }
    return this.repo.save(wallet);
  }

  findById(id: string): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['owner'],
    });
  }

  findByNameAndOwnerId(name: string, ownerId: string): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { name, ownerId },
    });
  }

  async findWalletsByUserId(userId: string): Promise<Wallet[]> {
    return this.repo
      .createQueryBuilder('wallet')
      .innerJoin('wallet.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('wallet.owner', 'owner')
      .where('wallet.deletedAt IS NULL')
      .andWhere('member.deletedAt IS NULL')
      .orderBy('wallet.createdAt', 'DESC')
      .getMany();
  }
}
