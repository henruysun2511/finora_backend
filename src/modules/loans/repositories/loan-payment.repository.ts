import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LoanPayment } from '../entities/loan-payment.entity';

@Injectable()
export class LoanPaymentRepository {
  constructor(
    @InjectRepository(LoanPayment)
    private readonly repo: Repository<LoanPayment>,
  ) {}

  create(data: Partial<LoanPayment>): LoanPayment {
    return this.repo.create(data);
  }

  async save(
    payment: LoanPayment,
    manager?: EntityManager,
  ): Promise<LoanPayment> {
    if (manager) {
      return manager.save(LoanPayment, payment);
    }
    return this.repo.save(payment);
  }

  async findByLoanId(
    loanId: string,
    manager?: EntityManager,
  ): Promise<LoanPayment[]> {
    const r = manager ? manager.getRepository(LoanPayment) : this.repo;
    return r.find({
      where: { loanId },
      relations: ['account'],
      order: {
        paymentDate: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async countByLoanId(
    loanId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const r = manager ? manager.getRepository(LoanPayment) : this.repo;
    return r.count({ where: { loanId } });
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<LoanPayment | null> {
    const r = manager ? manager.getRepository(LoanPayment) : this.repo;
    return r.findOne({ where: { id }, relations: ['account'] });
  }
}
