import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuditLogsController } from '../../src/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { AuditLogQueryDto } from '../../src/modules/audit-logs/dto/request/audit-log-query.dto';
import { ExportAuditLogDto } from '../../src/modules/audit-logs/dto/request/export-audit-log.dto';
import { PaginatedResponse } from '../../src/common/response/api-response';
import { AuditLogItemDto } from '../../src/modules/audit-logs/dto/response/audit-log-response.dto';
import { AuditLogDetailResponseDto } from '../../src/modules/audit-logs/dto/response/audit-log-detail-response.dto';
import { EntityTimelineResponseDto } from '../../src/modules/audit-logs/dto/response/entity-timeline-response.dto';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: jest.Mocked<Partial<AuditLogsService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockLogId = '22222222-2222-2222-2222-222222222222';
  const mockEntityId = '33333333-3333-3333-3333-333333333333';
  const mockDate = new Date('2026-10-18T10:15:30.000Z');

  const mockItem: AuditLogItemDto = {
    id: mockLogId,
    userId: mockUserId,
    userName: 'Hoàng Văn Minh',
    userAvatar: 'https://cdn.finora.app/avatars/minh.jpg',
    action: 'UPDATE',
    entityType: 'TRANSACTION',
    entityId: mockEntityId,
    summary: 'Đã cập nhật số tiền giao dịch từ 200.000₫ thành 500.000₫',
    ipAddress: '14.232.208.55',
    createdAt: mockDate,
  };

  const mockDetail: AuditLogDetailResponseDto = {
    id: mockLogId,
    userId: mockUserId,
    userName: 'Hoàng Văn Minh',
    action: 'UPDATE',
    entityType: 'TRANSACTION',
    entityId: mockEntityId,
    ipAddress: '14.232.208.55',
    userAgent: 'Mozilla/5.0',
    oldValue: { amount: 200000 },
    newValue: { amount: 500000 },
    diff: [{ field: 'amount', from: 200000, to: 500000 }],
    createdAt: mockDate,
  };

  const mockTimeline: EntityTimelineResponseDto = {
    entityType: 'TRANSACTION',
    entityId: mockEntityId,
    timeline: [
      {
        id: mockLogId,
        action: 'UPDATE',
        actorName: 'Hoàng Văn Minh',
        description: 'Đã cập nhật số tiền giao dịch từ 200.000₫ thành 500.000₫',
        createdAt: mockDate,
      },
    ],
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByEntity: jest.fn(),
      exportLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  describe('findAll', () => {
    it('nên trả về danh sách lịch sử hoạt động có phân trang', async () => {
      const paginatedResult = PaginatedResponse.of([mockItem], 1, 1, 20);
      (service.findAll as jest.Mock).mockResolvedValue(paginatedResult);

      const query: AuditLogQueryDto = { page: 1, limit: 20, skip: 0 };
      const result = await controller.findAll(mockUserId, false, query);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, query, false);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('nên trả về chi tiết audit log kèm diff view', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockDetail);

      const result = await controller.findOne(mockLogId, mockUserId, false);

      expect(service.findOne).toHaveBeenCalledWith(mockLogId, mockUserId, false);
      expect(result.data).toEqual(mockDetail);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('findByEntity', () => {
    it('nên trả về dòng thời gian biến động của 1 đối tượng', async () => {
      (service.findByEntity as jest.Mock).mockResolvedValue(mockTimeline);

      const result = await controller.findByEntity(
        'TRANSACTION',
        mockEntityId,
        mockUserId,
        false,
      );

      expect(service.findByEntity).toHaveBeenCalledWith(
        'TRANSACTION',
        mockEntityId,
        mockUserId,
        false,
      );
      expect(result.data).toEqual(mockTimeline);
    });
  });

  describe('export', () => {
    it('nên thiết lập header Content-Type và gửi nội dung CSV', async () => {
      const mockFile = {
        content: '\uFEFFThời gian,Người thực hiện\n',
        filename: 'audit_logs_test.csv',
        contentType: 'text/csv; charset=utf-8',
      };
      (service.exportLogs as jest.Mock).mockResolvedValue(mockFile);

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      const query: ExportAuditLogDto = {
        format: 'csv',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-18T00:00:00.000Z',
      };

      await controller.export(mockUserId, false, query, res);

      expect(service.exportLogs).toHaveBeenCalledWith(mockUserId, query, false);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', mockFile.contentType);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${mockFile.filename}"`,
      );
      expect(res.send).toHaveBeenCalledWith(mockFile.content);
    });
  });
});
