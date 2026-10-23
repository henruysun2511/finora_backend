import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalletMember } from '../entities/wallet-member.entity';
import { WalletMemberStatus } from '../../../common/enums/wallet-member-role.enum';

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

  async findAcceptedUserIds(walletId: string): Promise<string[]> {
    const members = await this.repo.find({
      where: { walletId, status: WalletMemberStatus.ACCEPTED },
      select: ['userId'],
    });
    return members.map((member) => member.userId);
  }

  async findByWalletAndUserForUpdate(
    walletId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<WalletMember | null> {
    return manager
      .createQueryBuilder(WalletMember, 'wm')
      .setLock('pessimistic_write')
      .where('wm.wallet_id = :walletId', { walletId })
      .andWhere('wm.user_id = :userId', { userId })
      .getOne();
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.softDelete(WalletMember, id);
      return;
    }
    await this.repo.softDelete(id);
  }

  async remove(member: WalletMember, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.remove(WalletMember, member);
      return;
    }
    await this.repo.remove(member);
  }
}

