import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { WalletRepository } from '../../src/modules/wallets/repository/wallet.repository';
import { WalletMemberRepository } from '../../src/modules/wallets/repository/wallet-member.repository';
import { WalletMapper } from '../../src/modules/wallets/mapper/wallet.mapper';
import { WalletNameAlreadyExistsException } from '../../src/modules/wallets/exceptions/wallet.exception';
import { CreateWalletDto } from '../../src/modules/wallets/dto/request/create-wallet.dto';
import { WalletMemberRole, WalletMemberStatus } from '../../src/common/enums/wallet-member-role.enum';
import { Wallet } from '../../src/modules/wallets/entities/wallet.entity';
import { WalletMember } from '../../src/modules/wallets/entities/wallet-member.entity';

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
      create: jest.fn(),
      save: jest.fn(),
    };

    walletMemberRepo = {
      create: jest.fn(),
      save: jest.fn(),
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

      // Giả lập transaction callback
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback({});
      });

      const result = await service.createWallet(mockUserId, dto);

      expect(walletRepo.findByNameAndOwnerId).toHaveBeenCalledWith(dto.name, mockUserId);
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
});
