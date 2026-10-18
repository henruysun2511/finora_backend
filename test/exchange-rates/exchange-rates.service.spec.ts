// test/exchange-rates/exchange-rates.service.spec.ts
import { ExchangeRatesService } from '../../src/modules/exchange-rates/exchange-rates.service';
import { UnsupportedCurrencyException } from '../../src/modules/exchange-rates/exceptions/exchange-rate.exception';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new ExchangeRatesService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    it('trả về tỷ giá 1:1 khi cùng một loại tiền tệ', async () => {
      const result = await service.getExchangeRate('VND', 'VND');
      expect(result.from).toBe('VND');
      expect(result.to).toBe('VND');
      expect(result.rate).toBe(1);
      expect(result.inverseRate).toBe(1);
      expect(result.isEstimated).toBe(false);
    });

    it('ném lỗi UnsupportedCurrencyException khi mã tiền tệ không hợp lệ', async () => {
      await expect(service.getExchangeRate('VIETNAMDONG', 'USD')).rejects.toBeInstanceOf(
        UnsupportedCurrencyException,
      );
      await expect(service.getExchangeRate('VND', '12')).rejects.toBeInstanceOf(
        UnsupportedCurrencyException,
      );
    });

    it('lấy tỷ giá thành công từ API bên ngoài (live)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: {
            VND: 25400,
            EUR: 0.92,
          },
        }),
      } as any);

      const result = await service.getExchangeRate('USD', 'VND');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.from).toBe('USD');
      expect(result.to).toBe('VND');
      expect(result.rate).toBe(25400);
      expect(result.inverseRate).toBeCloseTo(1 / 25400, 6);
      expect(result.source).toBe('live');
      expect(result.isEstimated).toBe(false);
    });

    it('sử dụng cache cho các lần gọi tiếp theo trong thời gian TTL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: {
            VND: 25400,
          },
        }),
      } as any);

      const firstCall = await service.getExchangeRate('USD', 'VND');
      expect(firstCall.source).toBe('live');

      const secondCall = await service.getExchangeRate('USD', 'VND');
      expect(secondCall.source).toBe('cache');
      expect(secondCall.rate).toBe(25400);
      // Không gọi fetch lần thứ 2
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('sử dụng fallback snapshot khi API bên ngoài bị lỗi kết nối', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

      const result = await service.getExchangeRate('USD', 'VND');
      expect(result.source).toBe('fallback');
      expect(result.isEstimated).toBe(true);
      expect(result.rate).toBe(25450); // Snapshot rate
    });

    it('tính toán tỷ giá chéo (cross rate) chính xác trong chế độ fallback', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Down'));

      // VND -> USD fallback = 1 / 25450
      const result = await service.getExchangeRate('VND', 'USD');
      expect(result.source).toBe('fallback');
      expect(result.isEstimated).toBe(true);
      expect(result.rate).toBeCloseTo(1 / 25450, 6);
    });
  });

  describe('convert', () => {
    it('tính toán số tiền quy đổi chính xác theo tỷ giá', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: {
            VND: 25400,
          },
        }),
      } as any);

      const result = await service.convert(100, 'USD', 'VND');
      expect(result.amount).toBe(100);
      expect(result.rate).toBe(25400);
      expect(result.convertedAmount).toBe(2_540_000);
    });
  });
});
