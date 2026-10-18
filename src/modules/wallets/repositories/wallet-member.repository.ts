import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalletMember } from '../entities/wallet-member.entity';

@Injectable()
export class WalletMemberRepository {
  constructor(
    @InjectRepository(WalletMember)
    private readonly repo: Repository<WalletMember>,
  ) {}

  create(data: Partial<WalletMember>): WalletMember {
    return this.repo.create(data);
  }

  save(member: WalletMember, manager?: EntityManager): Promise<WalletMember> {
    if (manager) {
      return manager.save(WalletMember, member);
    }
    return this.repo.save(member);
  }

  findByWalletAndUser(
    walletId: string,
    userId: string,
  ): Promise<WalletMember | null> {
    return this.repo.findOne({
      where: { walletId, userId },
      relations: ['user'],
    });
  }

  findByWalletId(walletId: string): Promise<WalletMember[]> {
    return this.repo.find({
      where: { walletId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
}
