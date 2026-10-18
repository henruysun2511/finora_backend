// test/exchange-rates/exchange-rates.controller.spec.ts
import { ExchangeRatesController } from '../../src/modules/exchange-rates/exchange-rates.controller';
import { ExchangeRatesService } from '../../src/modules/exchange-rates/exchange-rates.service';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let service: jest.Mocked<ExchangeRatesService>;

  beforeEach(() => {
    service = {
      getExchangeRate: jest.fn(),
      convert: jest.fn(),
    } as any;
    controller = new ExchangeRatesController(service);
  });

  it('lấy tỷ giá đơn thuần khi không truyền amount', async () => {
    service.getExchangeRate.mockResolvedValue({
      from: 'USD',
      to: 'VND',
      rate: 25400,
      inverseRate: 1 / 25400,
      updatedAt: new Date(),
      source: 'live',
      isEstimated: false,
    });

    const res = await controller.getExchangeRate('USD', 'VND', {});
    expect(service.getExchangeRate).toHaveBeenCalledWith('USD', 'VND');
    expect(res.data.rate).toBe(25400);
  });

  it('tính toán quy đổi khi có truyền amount', async () => {
    service.convert.mockResolvedValue({
      from: 'USD',
      to: 'VND',
      rate: 25400,
      inverseRate: 1 / 25400,
      amount: 10,
      convertedAmount: 254000,
      updatedAt: new Date(),
      source: 'live',
      isEstimated: false,
    });

    const res = await controller.getExchangeRate('USD', 'VND', { amount: 10 });
    expect(service.convert).toHaveBeenCalledWith(10, 'USD', 'VND');
    expect((res.data as any).convertedAmount).toBe(254000);
  });
});
