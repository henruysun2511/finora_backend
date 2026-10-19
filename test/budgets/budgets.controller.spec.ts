import { BudgetsController } from '../../src/modules/budgets/budgets.controller';
import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { BudgetQueryDto } from '../../src/modules/budgets/dto/request/budget-query.dto';
import { CreateBudgetDto } from '../../src/modules/budgets/dto/request/create-budget.dto';
import { UpdateBudgetDto } from '../../src/modules/budgets/dto/request/update-budget.dto';
import { PaginatedResponse } from '../../src/common/response/api-response';
import { RecurrencePeriod } from '../../src/common/enums/recurrence-period.enum';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let service: jest.Mocked<BudgetsService>;

  const USER_ID = 'u-123';

  beforeEach(() => {
    service = {
      createBudget: jest.fn(),
      getBudgets: jest.fn(),
      getBudgetById: jest.fn(),
      getBudgetStatus: jest.fn(),
      updateBudget: jest.fn(),
      deleteBudget: jest.fn(),
      resetPeriod: jest.fn(),
    } as any;

    controller = new BudgetsController(service);
  });

  it('create gọi service và trả về 201 Created', async () => {
    const dto: CreateBudgetDto = {
      walletId: 'wallet-1',
      categoryId: 'category-1',
      period: RecurrencePeriod.MONTHLY,
      limitAmount: 5000000,
      startDate: '2026-10-01',
      isRollover: true,
    };
    const mockResponse = {
      id: 'budget-1',
      walletId: dto.walletId,
      categoryId: dto.categoryId,
      limitAmount: dto.limitAmount,
      period: dto.period,
    } as any;
    service.createBudget.mockResolvedValue(mockResponse);

    const res = await controller.create(USER_ID, dto);

    expect(service.createBudget).toHaveBeenCalledWith(USER_ID, dto);
    expect(res.statusCode).toBe(201);
    expect(res.data?.id).toBe('budget-1');
    expect(res.message).toBe('Tạo ngân sách thành công');
  });

  it('list gọi service và trả về danh sách phân trang', async () => {
    const query: BudgetQueryDto = { page: 1, limit: 10 };
    const mockList = PaginatedResponse.of(
      [{ id: 'budget-1', limitAmount: 5000000 } as any],
      1,
      1,
      10,
    );
    service.getBudgets.mockResolvedValue(mockList);

    const res = await controller.list(USER_ID, query);

    expect(service.getBudgets).toHaveBeenCalledWith(USER_ID, query);
    expect(res.items).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('detail gọi service và trả về thông tin ngân sách', async () => {
    const mockResponse = {
      id: 'budget-1',
      limitAmount: 5000000,
      periods: [],
    } as any;
    service.getBudgetById.mockResolvedValue(mockResponse);

    const res = await controller.detail(USER_ID, 'budget-1');

    expect(service.getBudgetById).toHaveBeenCalledWith(USER_ID, 'budget-1');
    expect(res.statusCode).toBe(200);
    expect(res.data?.id).toBe('budget-1');
    expect(res.message).toBe('Lấy chi tiết ngân sách thành công');
  });

  it('status gọi service và trả về tiến độ ngân sách', async () => {
    const mockStatus = {
      budgetId: 'budget-1',
      spentAmount: 3900000,
      remainingAmount: 1300000,
      percentage: 75,
      dailyBudgetRemaining: 100000,
      alertStatus: 'SAFE',
    } as any;
    service.getBudgetStatus.mockResolvedValue(mockStatus);

    const res = await controller.status(USER_ID, 'budget-1');

    expect(service.getBudgetStatus).toHaveBeenCalledWith(USER_ID, 'budget-1');
    expect(res.statusCode).toBe(200);
    expect(res.data?.budgetId).toBe('budget-1');
    expect(res.data?.dailyBudgetRemaining).toBe(100000);
    expect(res.data?.alertStatus).toBe('SAFE');
    expect(res.message).toBe('Lấy tiến độ ngân sách thành công');
  });

  it('update gọi service và trả về ngân sách đã cập nhật', async () => {
    const dto: UpdateBudgetDto = { limitAmount: 7000000, isRollover: false };
    const mockResponse = {
      id: 'budget-1',
      limitAmount: 7000000,
      isRollover: false,
    } as any;
    service.updateBudget.mockResolvedValue(mockResponse);

    const res = await controller.update(USER_ID, 'budget-1', dto);

    expect(service.updateBudget).toHaveBeenCalledWith(USER_ID, 'budget-1', dto);
    expect(res.statusCode).toBe(200);
    expect(res.data?.limitAmount).toBe(7000000);
    expect(res.message).toBe('Cập nhật ngân sách thành công');
  });

  it('resetPeriod gọi service và trả về chu kỳ mới', async () => {
    const mockResponse = {
      id: 'budget-1',
      currentPeriod: { startDate: '2026-10-19', rolloverAmount: 200000 },
    } as any;
    service.resetPeriod.mockResolvedValue(mockResponse);

    const res = await controller.resetPeriod(USER_ID, 'budget-1');

    expect(service.resetPeriod).toHaveBeenCalledWith(USER_ID, 'budget-1');
    expect(res.statusCode).toBe(200);
    expect(res.data?.currentPeriod.rolloverAmount).toBe(200000);
    expect(res.message).toBe('Chuyển chu kỳ ngân sách thành công');
  });

  it('delete gọi service và trả về 200 OK', async () => {
    service.deleteBudget.mockResolvedValue(undefined);

    const res = await controller.delete(USER_ID, 'budget-1');

    expect(service.deleteBudget).toHaveBeenCalledWith(USER_ID, 'budget-1');
    expect(res.statusCode).toBe(200);
    expect(res.data).toBeNull();
    expect(res.message).toBe('Xóa ngân sách thành công');
  });
});
