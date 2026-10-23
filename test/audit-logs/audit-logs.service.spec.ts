import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { AuditLogRepository } from '../../src/modules/audit-logs/repositories/audit-log.repository';
import { AuditLogMapper } from '../../src/modules/audit-logs/mapper/audit-log.mapper';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { AuditLog } from '../../src/modules/audit-logs/entities/audit-log.entity';
import {
  AuditLogNotFoundException,
  AuditLogAccessDeniedException,
  ExportDateRangeExceededException,
  InvalidExportFormatException,
} from '../../src/modules/audit-logs/exceptions';
import { WalletAccessDeniedException } from '../../src/modules/wallets/exceptions/wallet.exception';
import { WalletMemberRole } from '../../src/common/enums/wallet-member-role.enum';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repo: jest.Mocked<Partial<AuditLogRepository>>;
  let mapper: AuditLogMapper;
  let walletsService: jest.Mocked<Partial<WalletsService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockWalletId = '22222222-2222-2222-2222-222222222222';
  const mockLogId = '33333333-3333-3333-3333-333333333333';
  const mockDate = new Date('2026-10-18T10:15:30.000Z');

  const mockAuditLog: AuditLog = {
    id: mockLogId,
    userId: mockUserId,
    walletId: mockWalletId,
    action: 'UPDATE',
    entityType: 'TRANSACTION',
    entityId: '44444444-4444-4444-4444-444444444444',
    ipAddress: '14.232.208.55',
    userAgent: 'Mozilla/5.0',
    oldValue: { amount: 200000, note: 'Cũ' },
    newValue: { amount: 500000, note: 'Mới' },
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: undefined,
  } as AuditLog;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => ({ ...data, id: mockLogId })),
      save: jest.fn().mockResolvedValue(mockAuditLog),
      findById: jest.fn(),
      findPaginated: jest.fn(),
      findAllForExport: jest.fn(),
      findByEntity: jest.fn(),
    };

    walletsService = {
      getMemberRole: jest.fn(),
      getUserWalletIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        AuditLogMapper,
        {
          provide: AuditLogRepository,
          useValue: repo,
        },
        {
          provide: WalletsService,
          useValue: walletsService,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    mapper = module.get<AuditLogMapper>(AuditLogMapper);
  });

  describe('recordLog', () => {
    it('nên ghi nhận audit log ngầm mà không throw error khi DB lỗi', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
      (repo.save as jest.Mock).mockRejectedValue(new Error('DB Timeout'));

      await expect(
        service.recordLog({
          userId: mockUserId,
          action: 'LOGIN',
          entityType: 'AUTH',
        }),
      ).resolves.not.toThrow();

      await new Promise((resolve) => setImmediate(resolve));
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB Timeout'),
        expect.any(String),
      );
      loggerSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('nên ném WalletAccessDeniedException nếu user không có quyền trong ví', async () => {
      (walletsService.getMemberRole as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAll(mockUserId, {
          walletId: mockWalletId,
          page: 1,
          limit: 20,
          skip: 0,
        }),
      ).rejects.toThrow(WalletAccessDeniedException);
    });

    it('nên trả về danh sách phân trang khi user có quyền', async () => {
      (walletsService.getMemberRole as jest.Mock).mockResolvedValue(
        WalletMemberRole.OWNER,
      );
      (repo.findPaginated as jest.Mock).mockResolvedValue([[mockAuditLog], 1]);

      const result = await service.findAll(mockUserId, {
        walletId: mockWalletId,
        page: 1,
        limit: 20,
        skip: 0,
      });

      expect(result.items.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('nên ném AuditLogNotFoundException nếu log không tồn tại', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('invalid-id', mockUserId)).rejects.toThrow(
        AuditLogNotFoundException,
      );
    });

    it('nên ném AuditLogAccessDeniedException nếu user không thuộc ví của log', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(mockAuditLog);
      (walletsService.getMemberRole as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(mockLogId, mockUserId)).rejects.toThrow(
        AuditLogAccessDeniedException,
      );
    });

    it('nên trả về chi tiết kèm diff khi user hợp lệ', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(mockAuditLog);
      (walletsService.getMemberRole as jest.Mock).mockResolvedValue(
        WalletMemberRole.OWNER,
      );

      const result = await service.findOne(mockLogId, mockUserId);

      expect(result.id).toBe(mockLogId);
      expect(result.diff).toHaveLength(2);
      expect(result.diff).toEqual(
        expect.arrayContaining([
          { field: 'amount', from: 200000, to: 500000 },
          { field: 'note', from: 'Cũ', to: 'Mới' },
        ]),
      );
    });
  });

  describe('exportLogs', () => {
    it('nên ném InvalidExportFormatException nếu định dạng không phải csv hoặc xlsx', async () => {
      await expect(
        service.exportLogs(mockUserId, {
          format: 'pdf' as any,
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-10-18T00:00:00.000Z',
        }),
      ).rejects.toThrow(InvalidExportFormatException);
    });

    it('nên ném ExportDateRangeExceededException nếu khoảng thời gian > 90 ngày', async () => {
      await expect(
        service.exportLogs(mockUserId, {
          format: 'csv',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(ExportDateRangeExceededException);
    });

    it('nên xuất nội dung CSV có UTF-8 BOM thành công', async () => {
      (repo.findAllForExport as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.exportLogs(mockUserId, {
        format: 'csv',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-18T00:00:00.000Z',
      });

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.content.startsWith('\uFEFF')).toBe(true);
      expect(result.content).toContain('Thời gian');
    });
  });
});
