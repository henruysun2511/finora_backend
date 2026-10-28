import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Receipt } from '../entities/receipt.entity';

@Injectable()
export class ReceiptRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly repo: Repository<Receipt>,
  ) {}

  create(data: Partial<Receipt>): Receipt {
    return this.repo.create(data);
  }

  save(receipt: Receipt, manager?: EntityManager): Promise<Receipt> {
    return manager ? manager.save(receipt) : this.repo.save(receipt);
  }

  async createAndSave(
    data: Partial<Receipt>,
    manager?: EntityManager,
  ): Promise<Receipt> {
    const entity = this.create(data);
    return this.save(entity, manager);
  }

  findById(id: string, manager?: EntityManager): Promise<Receipt | null> {
    const repository = manager ? manager.getRepository(Receipt) : this.repo;
    return repository.findOne({
      where: { id },
      relations: ['account', 'transactions'],
    });
  }

  findByAccountId(
    accountId: string,
    manager?: EntityManager,
  ): Promise<Receipt[]> {
    const repository = manager ? manager.getRepository(Receipt) : this.repo;
    return repository.find({
      where: { accountId },
      order: { scannedAt: 'DESC' },
    });
  }
}
