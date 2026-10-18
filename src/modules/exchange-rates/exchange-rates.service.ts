// src/modules/exchange-rates/exchange-rates.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_EXCHANGE_RATE_API_URL,
  EXCHANGE_RATE_CACHE_TTL_MS,
  EXCHANGE_RATE_REQUEST_TIMEOUT_MS,
  FALLBACK_RATES_TO_USD,
} from './exchange-rates.constant';
import {
  ConvertCurrencyResponseDto,
  ExchangeRateResponseDto,
} from './dto/response/exchange-rate-response.dto';
import { UnsupportedCurrencyException } from './exceptions/exchange-rate.exception';

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>;
}

const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private readonly cache = new Map<string, CachedRates>();

  /**
   * Lấy tỷ giá giữa 2 đồng tiền (from -> to).
   *
   * @param from - Mã tiền tệ nguồn (ví dụ: 'VND')
   * @param to - Mã tiền tệ đích (ví dụ: 'USD')
   * @returns ExchangeRateResponseDto
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRateResponseDto> {
    const base = from.trim().toUpperCase();
    const target = to.trim().toUpperCase();

    this.validateCurrencyCode(base);
    this.validateCurrencyCode(target);

    // Cùng loại tiền tệ -> tỷ giá 1:1
    if (base === target) {
      return {
        from: base,
        to: target,
        rate: 1,
        inverseRate: 1,
        updatedAt: new Date(),
        source: 'live',
        isEstimated: false,
      };
    }

    const { rate, inverseRate, source, isEstimated, updatedAt } = await this.resolveRate(
      base,
      target,
    );

    return {
      from: base,
      to: target,
      rate,
      inverseRate,
      updatedAt,
      source,
      isEstimated,
    };
  }

  /**
   * Tính toán quy đổi số tiền từ đồng tiền nguồn sang đích.
   *
   * @param amount - Số tiền cần đổi (theo currency nguồn)
   * @param from - Mã tiền tệ nguồn
   * @param to - Mã tiền tệ đích
   * @returns ConvertCurrencyResponseDto
   */
  async convert(amount: number, from: string, to: string): Promise<ConvertCurrencyResponseDto> {
    const rateInfo = await this.getExchangeRate(from, to);
    const convertedAmount = round2(amount * rateInfo.rate);

    return {
      ...rateInfo,
      amount,
      convertedAmount,
    };
  }

  // ---------------------------------------------------------------- private helpers

  private validateCurrencyCode(code: string): void {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new UnsupportedCurrencyException(code);
    }
  }

  private async resolveRate(
    base: string,
    target: string,
  ): Promise<{
    rate: number;
    inverseRate: number;
    source: 'live' | 'cache' | 'fallback';
    isEstimated: boolean;
    updatedAt: Date;
  }> {
    const now = Date.now();
    const cached = this.cache.get(base);

    // 1. Kiểm tra cache còn hạn (TTL 1h)
    if (cached && now - cached.timestamp < EXCHANGE_RATE_CACHE_TTL_MS) {
      const targetRate = cached.rates[target];
      if (targetRate !== undefined) {
        return {
          rate: round6(targetRate),
          inverseRate: round6(1 / targetRate),
          source: 'cache',
          isEstimated: false,
          updatedAt: new Date(cached.timestamp),
        };
      }
    }

    // 2. Gọi API bên ngoài lấy tỷ giá mới nhất
    try {
      const fetchedRates = await this.fetchFromExternalApi(base);
      this.cache.set(base, { timestamp: now, rates: fetchedRates });

      const targetRate = fetchedRates[target];
      if (targetRate !== undefined) {
        return {
          rate: round6(targetRate),
          inverseRate: round6(1 / targetRate),
          source: 'live',
          isEstimated: false,
          updatedAt: new Date(now),
        };
      }
    } catch (error: any) {
      this.logger.warn(
        `Không thể tải tỷ giá từ API ngoài cho base "${base}": ${error?.message}. Đang kích hoạt cơ chế dự phòng (fallback)...`,
      );
    }

    // 3. Fallback cấp 1: Dùng cache cũ (dù đã quá TTL) nếu có
    if (cached && cached.rates[target] !== undefined) {
      const targetRate = cached.rates[target];
      return {
        rate: round6(targetRate),
        inverseRate: round6(1 / targetRate),
        source: 'cache',
        isEstimated: true,
        updatedAt: new Date(cached.timestamp),
      };
    }

    // 4. Fallback cấp 2: Dùng bảng snapshot tỷ giá dự phòng (qua đồng USD)
    const fallbackRate = this.calculateFallbackCrossRate(base, target);
    return {
      rate: round6(fallbackRate),
      inverseRate: round6(1 / fallbackRate),
      source: 'fallback',
      isEstimated: true,
      updatedAt: new Date(),
    };
  }

  private async fetchFromExternalApi(base: string): Promise<Record<string, number>> {
    const apiUrl = process.env.EXCHANGE_RATE_API_URL || DEFAULT_EXCHANGE_RATE_API_URL;
    const url = `${apiUrl}/${base}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXCHANGE_RATE_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data?.result !== 'success' || !data?.rates) {
        throw new Error(`Phản hồi API tỷ giá không hợp lệ`);
      }

      return data.rates as Record<string, number>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private calculateFallbackCrossRate(base: string, target: string): number {
    const usdToBase = FALLBACK_RATES_TO_USD[base];
    const usdToTarget = FALLBACK_RATES_TO_USD[target];

    if (!usdToBase || !usdToTarget) {
      // Nếu là ngoại tệ chưa cấu hình trong snapshot, mặc định 1
      this.logger.error(`Thiếu tỷ giá fallback cho ${base} hoặc ${target}`);
      return 1;
    }

    // rate(base -> target) = (USD -> target) / (USD -> base)
    return usdToTarget / usdToBase;
  }
}
