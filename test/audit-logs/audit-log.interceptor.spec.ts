import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from '../../src/modules/audit-logs/interceptors/audit-log.interceptor';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../../src/modules/audit-logs/audit-logs.constant';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let reflector: jest.Mocked<Partial<Reflector>>;
  let auditLogsService: jest.Mocked<Partial<AuditLogsService>>;

  const mockUserId = '11111111-1111-4111-a111-111111111111';
  const mockWalletId = '22222222-2222-4222-a222-222222222222';
  const mockEntityId = '33333333-3333-4333-a333-333333333333';

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    auditLogsService = {
      recordLog: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new AuditLogInterceptor(
      reflector as unknown as Reflector,
      auditLogsService as unknown as AuditLogsService,
    );
  });

  const createMockContext = (
    req: Record<string, any>,
    handler: any = jest.fn(),
    cls: any = jest.fn(),
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: any): CallHandler => {
    return {
      handle: () => of(response),
    };
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should bypass audit logging if @Auditable metadata is not found', (done) => {
    reflector.getAllAndOverride!.mockReturnValue(undefined);

    const context = createMockContext({});
    const next = createMockCallHandler({ data: 'ok' });

    interceptor.intercept(context, next).subscribe({
      next: (val) => {
        expect(val).toEqual({ data: 'ok' });
        expect(auditLogsService.recordLog).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should record audit log with extracted parameters and sanitized payload', (done) => {
    reflector.getAllAndOverride!.mockReturnValue({
      action: AUDIT_LOG_ACTION.UPDATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
    });

    const mockReq = {
      method: 'PATCH',
      user: { id: mockUserId },
      headers: {
        'x-forwarded-for': '123.45.67.89, 10.0.0.1',
        'user-agent': 'Jest-Agent/1.0',
      },
      body: {
        fullName: 'New Name',
        password: 'superSecretPassword',
        nested: {
          pin: '1234',
          theme: 'dark',
        },
      },
      params: { id: mockEntityId },
    };

    const context = createMockContext(mockReq);
    const next = createMockCallHandler({ success: true, data: { id: mockEntityId } });

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.recordLog).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserId,
            action: AUDIT_LOG_ACTION.UPDATE,
            entityType: AUDIT_LOG_ENTITY_TYPE.USER,
            entityId: mockEntityId,
            ipAddress: '123.45.67.89',
            userAgent: 'Jest-Agent/1.0',
            newValue: {
              fullName: 'New Name',
              password: '[REDACTED]',
              nested: {
                pin: '[REDACTED]',
                theme: 'dark',
              },
            },
          }),
        );
        done();
      },
    });
  });

  it('should support custom entityId and walletId callbacks', (done) => {
    reflector.getAllAndOverride!.mockReturnValue({
      action: AUDIT_LOG_ACTION.CREATE,
      entityType: AUDIT_LOG_ENTITY_TYPE.TRANSACTION,
      entityId: (_req: any, res: any) => res.transactionId,
      walletId: (req: any) => req.query.wId,
    });

    const mockReq = {
      method: 'POST',
      user: { id: mockUserId },
      query: { wId: mockWalletId },
      headers: {},
      body: { amount: 50000 },
    };

    const context = createMockContext(mockReq);
    const next = createMockCallHandler({ transactionId: mockEntityId });

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.recordLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityId: mockEntityId,
            walletId: mockWalletId,
            action: AUDIT_LOG_ACTION.CREATE,
            entityType: AUDIT_LOG_ENTITY_TYPE.TRANSACTION,
          }),
        );
        done();
      },
    });
  });

  it('should ignore invalid UUIDs to prevent database schema errors', (done) => {
    reflector.getAllAndOverride!.mockReturnValue({
      action: AUDIT_LOG_ACTION.DELETE,
      entityType: AUDIT_LOG_ENTITY_TYPE.USER,
      entityId: 'invalid-non-uuid-string',
    });

    const mockReq = {
      method: 'DELETE',
      user: { id: 'not-a-uuid' },
      headers: {},
      params: { id: 'not-a-uuid' },
    };

    const context = createMockContext(mockReq);
    const next = createMockCallHandler(undefined);

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.recordLog).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined,
            entityId: undefined,
            action: AUDIT_LOG_ACTION.DELETE,
          }),
        );
        done();
      },
    });
  });
});
