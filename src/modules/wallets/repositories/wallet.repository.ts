import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Wallet } from '../entities/wallet.entity';
import { Account } from '../../accounts/entities/account.entity';
import { WalletMemberStatus } from '../../../common/enums/wallet-member-role.enum';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
    // ⚠️ LƯU Ý KIẾN TRÚC:
    // Tạm thời inject Repository<Account> do module accounts chưa hoàn thiện Service/Repository.
    // Khi module accounts được xây dựng, cần chuyển logic truy vấn tài khoản về AccountsService
    // và WalletsService sẽ gọi AccountsService, KHÔNG được inject Repository<Account> tại đây.
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
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

  async findByIdForUpdate(
    id: string,
    manager: EntityManager,
  ): Promise<Wallet | null> {
    return manager
      .createQueryBuilder(Wallet, 'wallet')
      .setLock('pessimistic_write')
      .where('wallet.id = :id', { id })
      .getOne();
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
      .innerJoinAndSelect(
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
      .innerJoinAndSelect(
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

  async findAccountsByWalletId(walletId: string): Promise<Account[]> {
    return this.accountRepo.find({
      where: { walletId },
      order: { createdAt: 'ASC' },
    });
  }

  async getBalancesByAccountIds(
    accountIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!accountIds || accountIds.length === 0) {
      return map;
    }

    const raw = await this.repo.manager
      .createQueryBuilder()
      .select('t.account_id', 'accountId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)`,
        'balance',
      )
      .from('transactions', 't')
      .where('t.account_id IN (:...accountIds)', { accountIds })
      .andWhere('t.deleted_at IS NULL')
      .groupBy('t.account_id')
      .getRawMany();

    for (const r of raw) {
      map.set(r.accountId, parseFloat(r.balance) || 0);
    }
    return map;
  }
}
