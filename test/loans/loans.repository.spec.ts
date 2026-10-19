import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanRepository } from '../../src/modules/loans/repositories/loan.repository';
import { LoanPaymentRepository } from '../../src/modules/loans/repositories/loan-payment.repository';
import { Loan } from '../../src/modules/loans/entities/loan.entity';
import { LoanPayment } from '../../src/modules/loans/entities/loan-payment.entity';
import { LoanType } from '../../src/modules/loans/enums/loan-type.enum';
import { LoanStatus } from '../../src/modules/loans/enums/loan-status.enum';

describe('LoanRepository and LoanPaymentRepository', () => {
  let loanRepo: LoanRepository;
  let loanPaymentRepo: LoanPaymentRepository;
  let typeormLoanRepo: jest.Mocked<Partial<Repository<Loan>>>;
  let typeormPaymentRepo: jest.Mocked<Partial<Repository<LoanPayment>>>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawOne: jest.fn().mockResolvedValue({
      totalLent: '1000',
      totalBorrowed: '500',
      overdueCount: '1',
      activeCount: '2',
    }),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue({ id: 'loan-1' }),
  };

  beforeEach(async () => {
    typeormLoanRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      findOne: jest.fn().mockResolvedValue({ id: 'loan-1' } as any),
      softDelete: jest.fn().mockResolvedValue({} as any),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    typeormPaymentRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'pay-1' } as any),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanRepository,
        LoanPaymentRepository,
        { provide: getRepositoryToken(Loan), useValue: typeormLoanRepo },
        { provide: getRepositoryToken(LoanPayment), useValue: typeormPaymentRepo },
      ],
    }).compile();

    loanRepo = module.get<LoanRepository>(LoanRepository);
    loanPaymentRepo = module.get<LoanPaymentRepository>(LoanPaymentRepository);
  });

  describe('LoanRepository', () => {
    it('create and save delegates to TypeORM repository', async () => {
      const loan = loanRepo.create({ contactName: 'Nam' });
      expect(loan.contactName).toBe('Nam');

      await loanRepo.save(loan as any);
      expect(typeormLoanRepo.save).toHaveBeenCalled();
    });

    it('save with manager uses manager.save', async () => {
      const manager = { save: jest.fn().mockResolvedValue({ id: 'saved' }) } as any;
      const res = await loanRepo.save({} as any, manager);
      expect(manager.save).toHaveBeenCalled();
      expect(res.id).toBe('saved');
    });

    it('findById and findByIdWithRelations delegate to TypeORM', async () => {
      await loanRepo.findById('loan-1');
      expect(typeormLoanRepo.findOne).toHaveBeenCalled();

      await loanRepo.findByIdWithRelations('loan-1');
      expect(typeormLoanRepo.findOne).toHaveBeenCalled();
    });

    it('findByIdWithLock sets pessimistic write lock', async () => {
      const manager = {
        getRepository: jest.fn().mockReturnValue(typeormLoanRepo),
      } as any;
      await loanRepo.findByIdWithLock('loan-1', manager);
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('updateStatusOverdue executes bulk update', async () => {
      await loanRepo.updateStatusOverdue('wallet-1');
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('findPaged builds query with filters and sorting', async () => {
      await loanRepo.findPaged('wallet-1', {
        type: LoanType.LENT,
        status: LoanStatus.ACTIVE,
        search: 'nam',
        page: 1,
        limit: 10,
      });
      expect(typeormLoanRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('getSummary returns aggregated numbers', async () => {
      const summary = await loanRepo.getSummary('wallet-1');
      expect(summary.totalLent).toBe(1000);
      expect(summary.totalBorrowed).toBe(500);
      expect(summary.netBalance).toBe(500);
    });

    it('softDelete delegates to TypeORM or manager', async () => {
      await loanRepo.softDelete('loan-1');
      expect(typeormLoanRepo.softDelete).toHaveBeenCalledWith('loan-1');

      const manager = { softDelete: jest.fn().mockResolvedValue(undefined) } as any;
      await loanRepo.softDelete('loan-1', manager);
      expect(manager.softDelete).toHaveBeenCalledWith(Loan, 'loan-1');
    });
  });

  describe('LoanPaymentRepository', () => {
    it('create, save, findByLoanId, countByLoanId, findById delegate to TypeORM', async () => {
      const payment = loanPaymentRepo.create({ amount: 500000 });
      expect(payment.amount).toBe(500000);

      await loanPaymentRepo.save(payment as any);
      expect(typeormPaymentRepo.save).toHaveBeenCalled();

      const manager = { save: jest.fn().mockResolvedValue({ id: 'saved' }) } as any;
      await loanPaymentRepo.save(payment as any, manager);
      expect(manager.save).toHaveBeenCalled();

      await loanPaymentRepo.findByLoanId('loan-1');
      expect(typeormPaymentRepo.find).toHaveBeenCalled();

      await loanPaymentRepo.countByLoanId('loan-1');
      expect(typeormPaymentRepo.count).toHaveBeenCalled();

      await loanPaymentRepo.findById('pay-1');
      expect(typeormPaymentRepo.findOne).toHaveBeenCalled();
    });
  });
});
