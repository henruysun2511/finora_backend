import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { WalletRepository } from '../../src/modules/wallets/repository/wallet.repository';
import { WalletMemberRepository } from '../../src/modules/wallets/repository/wallet-member.repository';
import { WalletMapper } from '../../src/modules/wallets/mapper/wallet.mapper';
import {
  WalletNameAlreadyExistsException,
  WalletNotFoundException,
  WalletAccessDeniedException,
} from '../../src/modules/wallets/exceptions/wallet.exception';
import { CreateWalletDto } from '../../src/modules/wallets/dto/request/create-wallet.dto';
import { UpdateWalletDto } from '../../src/modules/wallets/dto/request/update-wallet.dto';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../src/common/enums/wallet-member-role.enum';
import { Wallet } from '../../src/modules/wallets/entities/wallet.entity';
import { WalletMember } from '../../src/modules/wallets/entities/wallet-member.entity';
import { Account } from '../../src/modules/accounts/entities/account.entity';
import { AccountType } from '../../src/modules/accounts/enums/account-type.enum';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepo: jest.Mocked<Partial<WalletRepository>>;
  let walletMemberRepo: jest.Mocked<Partial<WalletMemberRepository>>;
  let dataSource: { transaction: jest.Mock };

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockWalletId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    walletRepo = {
      findByNameAndOwnerId: jest.fn(),
      findById: jest.fn(),
      findWalletsByUserIdPaginated: jest.fn(),
      softDeleteById: jest.fn(),
      findAccountsByWalletId: jest.fn(),
      getBalancesByAccountIds: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    walletMemberRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findByWalletAndUser: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        WalletMapper,
        { provide: WalletRepository, useValue: walletRepo },
        { provide: WalletMemberRepository, useValue: walletMemberRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  describe('createWallet', () => {
    const dto: CreateWalletDto = {
      name: 'Ví sinh hoạt',
      icon: '💼',
      description: 'Chi tiêu thường ngày',
      defaultCurrency: 'VND',
      isShared: false,
    };

    it('nên tạo ví thành công và gán quyền OWNER cho người tạo', async () => {
      walletRepo.findByNameAndOwnerId.mockResolvedValue(null);

      const createdWallet = {
        id: mockWalletId,
        ownerId: mockUserId,
        name: dto.name,
        icon: dto.icon,
        description: dto.description,
        defaultCurrency: 'VND',
        isShared: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Wallet;

      walletRepo.create.mockReturnValue(createdWallet);
      walletRepo.save.mockResolvedValue(createdWallet);

      const createdMember = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletMemberRepo.create.mockReturnValue(createdMember);
      walletMemberRepo.save.mockResolvedValue(createdMember);

      dataSource.transaction.mockImplementation(async (callback) => {
        return callback({});
      });

      const result = await service.createWallet(mockUserId, dto);

      expect(walletRepo.findByNameAndOwnerId).toHaveBeenCalledWith(
        dto.name,
        mockUserId,
      );
      expect(walletRepo.create).toHaveBeenCalled();
      expect(walletMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: mockWalletId,
          userId: mockUserId,
          role: WalletMemberRole.OWNER,
          status: WalletMemberStatus.ACCEPTED,
        }),
      );
      expect(result).toHaveProperty('id', mockWalletId);
      expect(result).toHaveProperty('currentUserRole', WalletMemberRole.OWNER);
      expect(result.name).toBe(dto.name);
    });

    it('nên ném lỗi WalletNameAlreadyExistsException nếu tên ví đã tồn tại với cùng owner', async () => {
      walletRepo.findByNameAndOwnerId.mockResolvedValue({
        id: 'existing-id',
        name: dto.name,
      } as Wallet);

      await expect(service.createWallet(mockUserId, dto)).rejects.toThrow(
        WalletNameAlreadyExistsException,
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('getWallets', () => {
    it('nên trả về danh sách ví có phân trang và map currentUserRole chính xác', async () => {
      const mockWallets = [
        {
          id: mockWalletId,
          name: 'Ví cá nhân',
          defaultCurrency: 'VND',
          isShared: false,
          isActive: true,
          ownerId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              walletId: mockWalletId,
              userId: mockUserId,
              role: WalletMemberRole.OWNER,
              status: WalletMemberStatus.ACCEPTED,
            } as WalletMember,
          ],
        } as Wallet,
      ];

      walletRepo.findWalletsByUserIdPaginated.mockResolvedValue([
        mockWallets,
        1,
      ]);

      const result = await service.getWallets(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(walletRepo.findWalletsByUserIdPaginated).toHaveBeenCalledWith(
        mockUserId,
        1,
        10,
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].currentUserRole).toBe(WalletMemberRole.OWNER);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getWalletById', () => {
    it('nên trả về chi tiết ví nếu người dùng có quyền truy cập', async () => {
      const wallet = {
        id: mockWalletId,
        name: 'Ví chi tiêu',
        ownerId: mockUserId,
        defaultCurrency: 'VND',
        isShared: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Wallet;

      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);

      const result = await service.getWalletById(mockWalletId, mockUserId);

      expect(result.id).toBe(mockWalletId);
      expect(result.currentUserRole).toBe(WalletMemberRole.OWNER);
    });

    it('nên ném lỗi WalletNotFoundException nếu không tìm thấy ví', async () => {
      walletRepo.findById.mockResolvedValue(null);

      await expect(
        service.getWalletById(mockWalletId, mockUserId),
      ).rejects.toThrow(WalletNotFoundException);
    });

    it('nên ném lỗi WalletAccessDeniedException nếu người dùng không thuộc ví', async () => {
      walletRepo.findById.mockResolvedValue({ id: mockWalletId } as Wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(null);

      await expect(
        service.getWalletById(mockWalletId, mockUserId),
      ).rejects.toThrow(WalletAccessDeniedException);
    });
  });

  describe('updateWallet', () => {
    const updateDto: UpdateWalletDto = { name: 'Ví cập nhật' };

    it('nên cập nhật ví thành công khi là OWNER', async () => {
      const wallet = {
        id: mockWalletId,
        name: 'Ví cũ',
        ownerId: mockUserId,
        defaultCurrency: 'VND',
        isShared: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Wallet;

      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);
      walletRepo.findByNameAndOwnerId.mockResolvedValue(null);
      walletRepo.save.mockResolvedValue({ ...wallet, name: updateDto.name! });

      const result = await service.updateWallet(
        mockWalletId,
        mockUserId,
        updateDto,
      );

      expect(result.name).toBe(updateDto.name);
      expect(walletRepo.save).toHaveBeenCalled();
    });

    it('nên ném lỗi WalletAccessDeniedException khi người cập nhật không phải OWNER', async () => {
      const wallet = {
        id: mockWalletId,
        name: 'Ví',
        ownerId: 'other-user',
      } as Wallet;
      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.VIEWER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);

      await expect(
        service.updateWallet(mockWalletId, mockUserId, updateDto),
      ).rejects.toThrow(WalletAccessDeniedException);
    });
  });

  describe('deleteWallet', () => {
    it('nên xóa mềm ví thành công khi người gọi là OWNER', async () => {
      const wallet = { id: mockWalletId, ownerId: mockUserId } as Wallet;
      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);
      walletRepo.softDeleteById.mockResolvedValue(undefined);

      await expect(
        service.deleteWallet(mockWalletId, mockUserId),
      ).resolves.not.toThrow();
      expect(walletRepo.softDeleteById).toHaveBeenCalledWith(mockWalletId);
    });
  });

  describe('getWalletAccounts', () => {
    it('nên trả về danh sách tài khoản kèm số dư tính toán', async () => {
      const wallet = { id: mockWalletId } as Wallet;
      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      const mockAccounts: Account[] = [
        {
          id: 'acc-1',
          walletId: mockWalletId,
          name: 'Vietcombank',
          type: AccountType.BANK,
          currency: 'VND',
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Account,
      ];

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);
      walletRepo.findAccountsByWalletId.mockResolvedValue(mockAccounts);
      walletRepo.getBalancesByAccountIds.mockResolvedValue(
        new Map([['acc-1', 15000000]]),
      );

      const result = await service.getWalletAccounts(mockWalletId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('acc-1');
      expect(result[0].balance).toBe(15000000);
    });
  });

  describe('getWalletBalance', () => {
    it('nên trả về tổng tài sản ví và thống kê theo từng loại tiền tệ', async () => {
      const wallet = {
        id: mockWalletId,
        name: 'Ví chi tiêu',
        defaultCurrency: 'VND',
      } as Wallet;

      const member = {
        walletId: mockWalletId,
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      const mockAccounts: Account[] = [
        {
          id: 'acc-1',
          walletId: mockWalletId,
          currency: 'VND',
          isArchived: false,
        } as Account,
        {
          id: 'acc-2',
          walletId: mockWalletId,
          currency: 'USD',
          isArchived: false,
        } as Account,
      ];

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);
      walletRepo.findAccountsByWalletId.mockResolvedValue(mockAccounts);
      walletRepo.getBalancesByAccountIds.mockResolvedValue(
        new Map([
          ['acc-1', 20000000],
          ['acc-2', 500],
        ]),
      );

      const result = await service.getWalletBalance(mockWalletId, mockUserId);

      expect(result.walletId).toBe(mockWalletId);
      expect(result.totalBalance).toBe(20000000);
      expect(result.breakdownByCurrency).toEqual({
        VND: 20000000,
        USD: 500,
      });
      expect(result.accountsCount).toBe(2);
    });
  });
});
