import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import {
  AUDITABLE_KEY,
  AuditableOptions,
} from '../decorators/auditable.decorator';
import { AuditLogsService } from '../audit-logs.service';

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'pin',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'otp',
  'creditcard',
  'cvv',
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.getAllAndOverride<AuditableOptions>(
      AUDITABLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: (res) => {
          this.handleLog(req, res, options);
        },
      }),
    );
  }

  private handleLog(req: any, res: any, options: AuditableOptions): void {
    try {
      const user = req.user;
      const rawUserId = user?.id || user?.sub || user?.userId;
      const userId =
        typeof rawUserId === 'string' && UUID_REGEX.test(rawUserId)
          ? rawUserId
          : undefined;

      const ipAddress = (
        req.headers?.['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        req.ip
      )
        ?.toString()
        .split(',')[0]
        .trim();

      const userAgent = req.headers?.['user-agent'];

      // ── Resolve entityId ──
      let rawEntityId: any;
      if (typeof options.entityId === 'function') {
        rawEntityId = options.entityId(req, res);
      } else if (typeof options.entityId === 'string') {
        rawEntityId =
          req.params?.[options.entityId] ||
          req.body?.[options.entityId] ||
          res?.data?.[options.entityId] ||
          res?.[options.entityId];
      } else {
        rawEntityId =
          res?.data?.id ||
          res?.id ||
          req.params?.id ||
          req.body?.id ||
          (options.entityType === 'USER' ? userId : undefined);
      }

      const entityId =
        typeof rawEntityId === 'string' && UUID_REGEX.test(rawEntityId)
          ? rawEntityId
          : undefined;

      // ── Resolve walletId ──
      let rawWalletId: any;
      if (typeof options.walletId === 'function') {
        rawWalletId = options.walletId(req, res);
      } else if (typeof options.walletId === 'string') {
        rawWalletId =
          req.params?.[options.walletId] ||
          req.body?.[options.walletId] ||
          res?.data?.[options.walletId] ||
          res?.[options.walletId];
      } else {
        rawWalletId =
          req.params?.walletId ||
          req.body?.walletId ||
          res?.data?.walletId ||
          res?.walletId;
      }

      const walletId =
        typeof rawWalletId === 'string' && UUID_REGEX.test(rawWalletId)
          ? rawWalletId
          : undefined;

      // ── Resolve oldValue ──
      let oldValue: Record<string, any> | undefined;
      if (typeof options.oldValue === 'function') {
        oldValue = this.sanitize(options.oldValue(req, res));
      } else if (req.oldValue) {
        oldValue = this.sanitize(req.oldValue);
      }

      // ── Resolve newValue ──
      let newValue: Record<string, any> | undefined;
      if (typeof options.newValue === 'function') {
        newValue = this.sanitize(options.newValue(req, res));
      } else if (options.includeBody !== false) {
        const method = req.method?.toUpperCase();
        if (
          ['POST', 'PATCH', 'PUT'].includes(method) &&
          req.body &&
          Object.keys(req.body).length > 0
        ) {
          newValue = this.sanitize(req.body);
        } else if (res?.data && typeof res.data === 'object') {
          newValue = this.sanitize(res.data);
        } else if (res && typeof res === 'object' && !('success' in res)) {
          newValue = this.sanitize(res);
        }
      }

      this.auditLogsService.recordLog({
        userId,
        walletId,
        action: options.action,
        entityType: options.entityType,
        entityId,
        ipAddress,
        userAgent,
        oldValue,
        newValue,
      });
    } catch (err: any) {
      this.logger.warn(
        `[AuditLogInterceptor] Lỗi khi xử lý audit log: ${err?.message}`,
      );
    }
  }

  private sanitize(data: any, depth = 0): any {
    if (!data || depth > 5) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item, depth + 1));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitize(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
