import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from '../../src/modules/wallets/wallets.controller';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { CreateWalletDto } from '../../src/modules/wallets/dto/request/create-wallet.dto';
import { UpdateWalletDto } from '../../src/modules/wallets/dto/request/update-wallet.dto';
import { WalletQueryDto } from '../../src/modules/wallets/dto/request/wallet-query.dto';
import { WalletResponseDto } from '../../src/modules/wallets/dto/response/wallet-response.dto';
import { WalletMemberRole } from '../../src/common/enums/wallet-member-role.enum';
import { AccountType } from '../../src/modules/accounts/enums/account-type.enum';
import { PaginatedResponse } from '../../src/common/response/api-response';

describe('WalletsController', () => {
  let controller: WalletsController;
  let service: jest.Mocked<Partial<WalletsService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockWalletId = '22222222-2222-2222-2222-222222222222';
  const mockDate = new Date('2026-10-17T00:00:00.000Z');

  const mockWalletResponse: WalletResponseDto = {
    id: mockWalletId,
    name: 'Ví chi tiêu gia đình',
    icon: '🏠',
    description: 'Quản lý sinh hoạt',
    defaultCurrency: 'VND',
    isShared: true,
    isActive: true,
    ownerId: mockUserId,
    currentUserRole: WalletMemberRole.OWNER,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    service = {
      createWallet: jest.fn(),
      getWallets: jest.fn(),
      getWalletById: jest.fn(),
      updateWallet: jest.fn(),
      deleteWallet: jest.fn(),
      getWalletAccounts: jest.fn(),
      getWalletBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  describe('create', () => {
    it('nên tạo ví thành công và trả về ApiResponse dạng created', async () => {
      const dto: CreateWalletDto = {
        name: 'Ví chi tiêu gia đình',
        icon: '🏠',
        description: 'Quản lý sinh hoạt',
        defaultCurrency: 'VND',
        isShared: true,
      };

      service.createWallet.mockResolvedValue(mockWalletResponse);

      const res = await controller.create(mockUserId, dto);

      expect(service.createWallet).toHaveBeenCalledWith(mockUserId, dto);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(res.data).toEqual(mockWalletResponse);
    });
  });

  describe('findAll', () => {
    it('nên lấy danh sách ví có phân trang thành công', async () => {
      const query: WalletQueryDto = { page: 1, limit: 10 };
      const paginated = PaginatedResponse.of([mockWalletResponse], 1, 1, 10);

      service.getWallets.mockResolvedValue(paginated);

      const res = await controller.findAll(mockUserId, query);

      expect(service.getWallets).toHaveBeenCalledWith(mockUserId, query);
      expect(res.success).toBe(true);
      expect(res.data).toEqual(paginated);
    });
  });

  describe('findOne', () => {
    it('nên lấy chi tiết ví thành công', async () => {
      service.getWalletById.mockResolvedValue(mockWalletResponse);

      const res = await controller.findOne(mockUserId, mockWalletId);

      expect(service.getWalletById).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockWalletResponse);
    });
  });

  describe('update', () => {
    it('nên cập nhật ví thành công', async () => {
      const updateDto: UpdateWalletDto = { name: 'Tên mới' };
      const updatedResponse = { ...mockWalletResponse, name: 'Tên mới' };

      service.updateWallet.mockResolvedValue(updatedResponse);

      const res = await controller.update(mockUserId, mockWalletId, updateDto);

      expect(service.updateWallet).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
        updateDto,
      );
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('Tên mới');
    });
  });

  describe('remove', () => {
    it('nên xóa ví thành công và trả về ApiResponse dạng noContent', async () => {
      service.deleteWallet.mockResolvedValue(undefined);

      const res = await controller.remove(mockUserId, mockWalletId);

      expect(service.deleteWallet).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });
  });

  describe('getAccounts', () => {
    it('nên lấy danh sách tài khoản trong ví thành công', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          walletId: mockWalletId,
          name: 'Vietcombank',
          type: AccountType.BANK,
          currency: 'VND',
          balance: 10000000,
          isArchived: false,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      service.getWalletAccounts.mockResolvedValue(mockAccounts);

      const res = await controller.getAccounts(mockUserId, mockWalletId);

      expect(service.getWalletAccounts).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockAccounts);
    });
  });

  describe('getBalance', () => {
    it('nên lấy tổng tài sản của ví thành công', async () => {
      const mockBalance = {
        walletId: mockWalletId,
        walletName: 'Ví chi tiêu gia đình',
        defaultCurrency: 'VND',
        totalBalance: 10000000,
        breakdownByCurrency: { VND: 10000000 },
        accountsCount: 1,
      };

      service.getWalletBalance.mockResolvedValue(mockBalance);

      const res = await controller.getBalance(mockUserId, mockWalletId);

      expect(service.getWalletBalance).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockBalance);
    });
  });
});
