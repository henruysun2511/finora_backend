import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from '../../src/modules/loans/loans.controller';
import { LoansService } from '../../src/modules/loans/loans.service';
import { LoanType } from '../../src/modules/loans/enums/loan-type.enum';
import { LoanStatus } from '../../src/modules/loans/enums/loan-status.enum';

describe('LoansController', () => {
  let controller: LoansController;
  let service: jest.Mocked<Partial<LoansService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockLoanId = '55555555-5555-5555-5555-555555555555';

  const sampleLoanResponse = {
    id: mockLoanId,
    type: LoanType.LENT,
    contactName: 'Anh Nam',
    principalAmount: 10000000,
    remainingAmount: 3000000,
    paidAmount: 7000000,
    progressPercentage: 70,
    currency: 'VND',
    dueDate: '2026-11-01T00:00:00.000Z',
    status: LoanStatus.ACTIVE,
  };

  beforeEach(async () => {
    service = {
      getLoans: jest.fn().mockResolvedValue({
        data: {
          items: [sampleLoanResponse],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      } as any),
      getSummary: jest.fn().mockResolvedValue({
        totalLent: 15000000,
        totalBorrowed: 4500000,
        netBalance: 10500000,
        overdueCount: 1,
        activeCount: 3,
        currency: 'VND',
      }),
      createLoan: jest.fn().mockResolvedValue(sampleLoanResponse),
      getLoanById: jest.fn().mockResolvedValue({
        ...sampleLoanResponse,
        walletId: 'w-1',
        accountId: 'a-1',
        accountName: 'VCB',
        loanDate: '2026-10-01',
        affectsBalance: true,
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01',
        recentPayments: [],
      } as any),
      updateLoan: jest.fn().mockResolvedValue(sampleLoanResponse),
      deleteLoan: jest.fn().mockResolvedValue(undefined),
      remindLoan: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Đã gửi thông báo nhắc nợ thành công' }),
      removeCounterparty: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Đã gỡ liên kết bạn bè thành công' }),
      recordPayment: jest.fn().mockResolvedValue({
        id: 'pay-1',
        loanId: mockLoanId,
        accountId: 'a-1',
        accountName: 'VCB',
        amount: 1000000,
        currency: 'VND',
        paymentDate: '2026-10-15',
        affectsBalance: true,
        createdAt: '2026-10-15',
      } as any),
      getPayments: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [{ provide: LoansService, useValue: service }],
    }).compile();

    controller = module.get<LoansController>(LoansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getLoans delegates to service', async () => {
    const res = await controller.getLoans(mockUserId, {});
    expect(service.getLoans).toHaveBeenCalledWith(mockUserId, {});
    expect(res).toBeDefined();
  });

  it('getSummary delegates to service', async () => {
    const res = await controller.getSummary(mockUserId, 'wallet-1');
    expect(service.getSummary).toHaveBeenCalledWith(mockUserId, 'wallet-1');
    expect(res.data.netBalance).toBe(10500000);
  });

  it('create delegates to service', async () => {
    const dto = {
      walletId: 'w-1',
      accountId: 'a-1',
      type: LoanType.LENT,
      contactName: 'Anh Nam',
      principalAmount: 10000000,
    };
    const res = await controller.create(mockUserId, dto);
    expect(service.createLoan).toHaveBeenCalledWith(mockUserId, dto);
    expect(res.data.contactName).toBe('Anh Nam');
  });

  it('getById delegates to service', async () => {
    const res = await controller.getById(mockUserId, mockLoanId);
    expect(service.getLoanById).toHaveBeenCalledWith(mockUserId, mockLoanId);
    expect(res.data.id).toBe(mockLoanId);
  });

  it('update delegates to service', async () => {
    const dto = { contactName: 'Anh Nam Mới' };
    const res = await controller.update(mockUserId, mockLoanId, dto);
    expect(service.updateLoan).toHaveBeenCalledWith(mockUserId, mockLoanId, dto);
    expect(res.data).toBeDefined();
  });

  it('delete delegates to service', async () => {
    const res = await controller.delete(mockUserId, mockLoanId);
    expect(service.deleteLoan).toHaveBeenCalledWith(mockUserId, mockLoanId);
    expect(res.success).toBe(true);
  });

  it('remind delegates to service', async () => {
    const res = await controller.remind(mockUserId, mockLoanId);
    expect(service.remindLoan).toHaveBeenCalledWith(mockUserId, mockLoanId);
    expect(res.data.success).toBe(true);
  });

  it('removeCounterparty delegates to service', async () => {
    const res = await controller.removeCounterparty(mockUserId, mockLoanId);
    expect(service.removeCounterparty).toHaveBeenCalledWith(mockUserId, mockLoanId);
    expect(res.data.success).toBe(true);
  });

  it('recordPayment delegates to service', async () => {
    const dto = { accountId: 'a-1', amount: 1000000 };
    const res = await controller.recordPayment(mockUserId, mockLoanId, dto);
    expect(service.recordPayment).toHaveBeenCalledWith(mockUserId, mockLoanId, dto);
    expect(res.data.amount).toBe(1000000);
  });

  it('getPayments delegates to service', async () => {
    const res = await controller.getPayments(mockUserId, mockLoanId);
    expect(service.getPayments).toHaveBeenCalledWith(mockUserId, mockLoanId);
    expect(res.data).toEqual([]);
  });
});
