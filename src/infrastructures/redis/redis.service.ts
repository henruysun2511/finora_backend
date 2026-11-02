import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfig } from '../../config/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  onModuleInit() {
    this.initClient();
  }

  private initClient() {
    try {
      this.client = new Redis({
        host: RedisConfig.HOST,
        port: RedisConfig.PORT,
        password: RedisConfig.PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Không thể kết nối tới Redis sau 3 lần thử.');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Đã kết nối thành công tới Redis (${RedisConfig.HOST}:${RedisConfig.PORT})`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Lỗi kết nối Redis: ${err.message}`);
      });

      // Kết nối bất đồng bộ không chặn luồng khởi động
      this.client.connect().catch((err) => {
        this.logger.warn(`Redis không khả dụng lúc khởi động: ${err.message}`);
      });
    } catch (error) {
      this.logger.warn(
        `Không thể khởi tạo Redis client: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private readonly memoryFallback = new Map<
    string,
    { value: any; expiresAt?: number }
  >();

  getClient(): Redis | null {
    return this.client;
  }

  get isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Lấy giá trị từ Redis (hoặc memory fallback)
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (this.isReady && this.client) {
      try {
        const data = await this.client.get(key);
        if (!data) return null;
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      } catch (err) {
        this.logger.error(`Lỗi Redis get(${key}): ${(err as Error).message}`);
      }
    }

    // Fallback: Kiểm tra cache trong bộ nhớ
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Lưu giá trị vào Redis kèm thời gian sống (TTL tính bằng giây)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const expiresAt =
      ttlSeconds && ttlSeconds > 0
        ? Date.now() + ttlSeconds * 1000
        : undefined;
    this.memoryFallback.set(key, { value, expiresAt });

    if (this.isReady && this.client) {
      try {
        const payload =
          typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, payload, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, payload);
        }
        return true;
      } catch (err) {
        this.logger.error(`Lỗi Redis set(${key}): ${(err as Error).message}`);
      }
    }
    return true;
  }

  /**
   * Xóa một hoặc nhiều khóa
   */
  async del(...keys: string[]): Promise<number> {
    for (const key of keys) {
      this.memoryFallback.delete(key);
    }
    if (this.isReady && this.client && keys.length > 0) {
      try {
        return await this.client.del(...keys);
      } catch (err) {
        this.logger.error(`Lỗi Redis del: ${(err as Error).message}`);
      }
    }
    return keys.length;
  }

  /**
   * Kiểm tra sự tồn tại của khóa
   */
  async exists(key: string): Promise<boolean> {
    if (this.isReady && this.client) {
      try {
        const count = await this.client.exists(key);
        if (count > 0) return true;
      } catch {
        // Fallback kiểm tra memory
      }
    }
    const entry = this.memoryFallback.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return false;
    }
    return true;
  }

  async onModuleDestroy() {
    this.memoryFallback.clear();
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}

