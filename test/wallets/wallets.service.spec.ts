import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { WalletRepository } from '../../src/modules/wallets/repositories/wallet.repository';
import { WalletMemberRepository } from '../../src/modules/wallets/repositories/wallet-member.repository';
import { WalletMapper } from '../../src/modules/wallets/mapper/wallet.mapper';
import { UsersService } from '../../src/modules/users/users.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { WalletGateway } from '../../src/modules/wallets/gateways/wallet.gateway';
import {
  WalletNameAlreadyExistsException,
  WalletNotFoundException,
  WalletAccessDeniedException,
  WalletMemberAlreadyExistsException,
  WalletMemberNotFoundException,
  CannotLeaveAsOwnerException,
  CannotRemoveOwnerException,
  WalletTargetNotMemberException,
  WalletMemberInviteNotFoundException,
  CannotModifyOwnerRoleException,
  WalletMemberSelfActionException,
} from '../../src/modules/wallets/exceptions/wallet.exception';
import { UserNotFoundException } from '../../src/modules/users/exceptions/user.exception';
import { CreateWalletDto } from '../../src/modules/wallets/dto/request/create-wallet.dto';
import { UpdateWalletDto } from '../../src/modules/wallets/dto/request/update-wallet.dto';
import { InviteWalletMemberDto } from '../../src/modules/wallets/dto/request/invite-wallet-member.dto';
import { UpdateWalletMemberRoleDto } from '../../src/modules/wallets/dto/request/update-wallet-member-role.dto';
import { TransferOwnershipDto } from '../../src/modules/wallets/dto/request/transfer-ownership.dto';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../src/common/enums/wallet-member-role.enum';
import { Wallet } from '../../src/modules/wallets/entities/wallet.entity';
import { WalletMember } from '../../src/modules/wallets/entities/wallet-member.entity';
import { Account } from '../../src/modules/accounts/entities/account.entity';
import { AccountType } from '../../src/modules/accounts/enums/account-type.enum';
import { WalletBalanceUpdatedEvent } from '../../src/modules/wallets/events/wallet-balance-updated.event';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepo: jest.Mocked<Partial<WalletRepository>>;
  let walletMemberRepo: jest.Mocked<Partial<WalletMemberRepository>>;
  let dataSource: { transaction: jest.Mock };
  let usersService: { findById: jest.Mock; findByEmail: jest.Mock };
  let notificationsService: { createNotification: jest.Mock };
  let walletGateway: {
    broadcastBalanceUpdated: jest.Mock;
    sendMemberInvited: jest.Mock;
    broadcastMemberJoined: jest.Mock;
    broadcastMemberRoleUpdated: jest.Mock;
    broadcastMemberRemoved: jest.Mock;
    broadcastBudgetAlert: jest.Mock;
    addSocketToWalletRoom: jest.Mock;
    removeSocketFromWalletRoom: jest.Mock;
  };

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockWalletId = '22222222-2222-2222-2222-222222222222';
  const mockTargetUserId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    walletRepo = {
      findByNameAndOwnerId: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findWalletsByUserIdPaginated: jest.fn(),
      findWalletsByUserId: jest.fn(),
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
      findByWalletAndUserForUpdate: jest.fn(),
      findByWalletId: jest.fn(),
      findAcceptedUserIds: jest.fn(),
      softDelete: jest.fn(),
      remove: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };

    notificationsService = {
      createNotification: jest.fn(),
    };

    walletGateway = {
      broadcastBalanceUpdated: jest.fn(),
      sendMemberInvited: jest.fn(),
      broadcastMemberJoined: jest.fn(),
      broadcastMemberRoleUpdated: jest.fn(),
      broadcastMemberRemoved: jest.fn(),
      broadcastBudgetAlert: jest.fn(),
      addSocketToWalletRoom: jest.fn(),
      removeSocketFromWalletRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        WalletMapper,
        { provide: WalletRepository, useValue: walletRepo },
        { provide: WalletMemberRepository, useValue: walletMemberRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: WalletGateway, useValue: walletGateway },
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

  // ── SHARED WALLET COLLABORATION TESTS ─────────────────────────────────────

  describe('inviteMember', () => {
    const inviteDto: InviteWalletMemberDto = {
      email: 'friend@finora.io',
      role: WalletMemberRole.EDITOR,
    };

    const mockOwnerWallet = {
      id: mockWalletId,
      ownerId: mockUserId,
      name: 'Ví nhóm bạn',
      owner: { fullName: 'Chủ ví' },
    } as Wallet;

    const mockTargetUser = {
      id: mockTargetUserId,
      email: 'friend@finora.io',
      fullName: 'Bạn bè',
    };

    it('nên mời thành viên thành công bằng email, lưu PENDING và phát socket', async () => {
      walletRepo.findById.mockResolvedValue(mockOwnerWallet);
      usersService.findByEmail.mockResolvedValue(mockTargetUser as any);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(null);

      const createdMember = {
        id: 'member-123',
        walletId: mockWalletId,
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.PENDING,
        createdAt: new Date(),
      } as WalletMember;

      walletMemberRepo.create.mockReturnValue(createdMember);
      walletMemberRepo.save.mockResolvedValue(createdMember);

      const result = await service.inviteMember(
        mockUserId,
        mockWalletId,
        inviteDto,
      );

      expect(result.walletId).toBe(mockWalletId);
      expect(result.userId).toBe(mockTargetUserId);
      expect(result.role).toBe(WalletMemberRole.EDITOR);
      expect(result.status).toBe(WalletMemberStatus.PENDING);
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(walletGateway.sendMemberInvited).toHaveBeenCalledWith(
        mockTargetUserId,
        expect.objectContaining({ walletId: mockWalletId }),
      );
    });

    it('nên ném lỗi WalletAccessDeniedException nếu người mời không phải OWNER', async () => {
      const notOwnerWallet = {
        id: mockWalletId,
        ownerId: 'different-owner',
      } as Wallet;
      walletRepo.findById.mockResolvedValue(notOwnerWallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue({
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember);

      await expect(
        service.inviteMember(mockUserId, mockWalletId, inviteDto),
      ).rejects.toThrow(WalletAccessDeniedException);
    });

    it('nên ném lỗi WalletMemberSelfActionException nếu chủ ví tự mời chính mình', async () => {
      walletRepo.findById.mockResolvedValue(mockOwnerWallet);
      usersService.findByEmail.mockResolvedValue({
        id: mockUserId,
        email: 'friend@finora.io',
      } as any);

      await expect(
        service.inviteMember(mockUserId, mockWalletId, inviteDto),
      ).rejects.toThrow(WalletMemberSelfActionException);
    });

    it('nên ném lỗi UserNotFoundException nếu email không tồn tại trong hệ thống', async () => {
      walletRepo.findById.mockResolvedValue(mockOwnerWallet);
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.inviteMember(mockUserId, mockWalletId, inviteDto),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('nên ném lỗi WalletMemberAlreadyExistsException nếu user đã là thành viên ACCEPTED', async () => {
      walletRepo.findById.mockResolvedValue(mockOwnerWallet);
      usersService.findByEmail.mockResolvedValue(mockTargetUser as any);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue({
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember);

      await expect(
        service.inviteMember(mockUserId, mockWalletId, inviteDto),
      ).rejects.toThrow(WalletMemberAlreadyExistsException);
    });
  });

  describe('acceptInvite', () => {
    it('nên chấp nhận lời mời, chuyển status ACCEPTED, bật isShared và join socket room', async () => {
      const wallet = {
        id: mockWalletId,
        isShared: false,
      } as Wallet;

      const member = {
        id: 'member-123',
        walletId: mockWalletId,
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.PENDING,
      } as WalletMember;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce({
          ...member,
          user: { fullName: 'Bạn bè', email: 'friend@finora.io' },
        } as any);

      dataSource.transaction.mockImplementation(async (callback) => {
        return callback({});
      });

      const result = await service.acceptInvite(mockTargetUserId, mockWalletId);

      expect(result.id).toBe(mockWalletId);
      expect(walletGateway.addSocketToWalletRoom).toHaveBeenCalledWith(
        mockTargetUserId,
        mockWalletId,
      );
      expect(walletGateway.broadcastMemberJoined).toHaveBeenCalled();
    });

    it('nên ném lỗi WalletMemberInviteNotFoundException nếu không có lời mời pending', async () => {
      walletRepo.findById.mockResolvedValue({ id: mockWalletId } as Wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(null);

      await expect(
        service.acceptInvite(mockTargetUserId, mockWalletId),
      ).rejects.toThrow(WalletMemberInviteNotFoundException);
    });
  });

  describe('rejectInvite', () => {
    it('nên từ chối lời mời và chuyển status REJECTED', async () => {
      const member = {
        id: 'member-123',
        walletId: mockWalletId,
        userId: mockTargetUserId,
        status: WalletMemberStatus.PENDING,
      } as WalletMember;

      walletMemberRepo.findByWalletAndUser.mockResolvedValue(member);
      walletMemberRepo.save.mockResolvedValue({
        ...member,
        status: WalletMemberStatus.REJECTED,
      });

      await service.rejectInvite(mockTargetUserId, mockWalletId);

      expect(member.status).toBe(WalletMemberStatus.REJECTED);
      expect(walletMemberRepo.save).toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('nên trả về danh sách thành viên hợp lệ trong ví', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      walletMemberRepo.findByWalletId.mockResolvedValue([
        {
          id: 'm1',
          userId: mockUserId,
          role: WalletMemberRole.OWNER,
          status: WalletMemberStatus.ACCEPTED,
          user: { fullName: 'Chủ ví', email: 'owner@finora.io' },
        } as WalletMember,
        {
          id: 'm2',
          userId: mockTargetUserId,
          role: WalletMemberRole.EDITOR,
          status: WalletMemberStatus.ACCEPTED,
          user: { fullName: 'Thành viên', email: 'member@finora.io' },
        } as WalletMember,
      ]);

      const result = await service.getMembers(mockWalletId, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe(WalletMemberRole.OWNER);
      expect(result[1].role).toBe(WalletMemberRole.EDITOR);
    });

    it('nên ném lỗi WalletAccessDeniedException nếu caller không thuộc ví', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: 'another-user',
      } as Wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue(null);

      await expect(
        service.getMembers(mockWalletId, 'stranger-id'),
      ).rejects.toThrow(WalletAccessDeniedException);
    });
  });

  describe('updateMemberRole', () => {
    const updateRoleDto: UpdateWalletMemberRoleDto = {
      role: WalletMemberRole.VIEWER,
    };

    it('nên cập nhật vai trò thành công và broadcast socket', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      const targetMember = {
        id: 'member-target',
        walletId: mockWalletId,
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletMemberRepo.findByWalletAndUser.mockResolvedValue(targetMember);
      walletMemberRepo.save.mockResolvedValue({
        ...targetMember,
        role: WalletMemberRole.VIEWER,
      });

      const result = await service.updateMemberRole(
        mockUserId,
        mockWalletId,
        mockTargetUserId,
        updateRoleDto,
      );

      expect(result.role).toBe(WalletMemberRole.VIEWER);
      expect(walletGateway.broadcastMemberRoleUpdated).toHaveBeenCalledWith(
        mockWalletId,
        expect.objectContaining({
          userId: mockTargetUserId,
          newRole: WalletMemberRole.VIEWER,
        }),
      );
    });

    it('nên ném lỗi CannotModifyOwnerRoleException nếu sửa quyền chính mình', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      await expect(
        service.updateMemberRole(
          mockUserId,
          mockWalletId,
          mockUserId,
          updateRoleDto,
        ),
      ).rejects.toThrow(CannotModifyOwnerRoleException);
    });
  });

  describe('transferOwnership', () => {
    const transferDto: TransferOwnershipDto = {
      newOwnerId: mockTargetUserId,
    };

    it('nên chuyển quyền chủ sở hữu nguyên tử trong transaction ACID', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      const wallet = {
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet;

      const currentOwnerMember = {
        id: 'm-owner',
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      const targetMember = {
        id: 'm-target',
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      dataSource.transaction.mockImplementation(async (callback) => {
        walletRepo.findByIdForUpdate.mockResolvedValue(wallet);
        walletMemberRepo.findByWalletAndUserForUpdate
          .mockResolvedValueOnce(targetMember)
          .mockResolvedValueOnce(currentOwnerMember);
        walletRepo.save.mockResolvedValue({
          ...wallet,
          ownerId: mockTargetUserId,
        });

        return callback({});
      });

      const result = await service.transferOwnership(
        mockUserId,
        mockWalletId,
        transferDto,
      );

      expect(targetMember.role).toBe(WalletMemberRole.OWNER);
      expect(currentOwnerMember.role).toBe(WalletMemberRole.EDITOR);
      expect(walletGateway.broadcastMemberRoleUpdated).toHaveBeenCalledTimes(2);
    });

    it('nên ném lỗi WalletMemberSelfActionException nếu chuyển cho chính mình', async () => {
      await expect(
        service.transferOwnership(mockUserId, mockWalletId, {
          newOwnerId: mockUserId,
        }),
      ).rejects.toThrow(WalletMemberSelfActionException);
    });
  });

  describe('kickMember', () => {
    it('nên kick thành viên thành công, soft delete và remove socket room', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      const targetMember = {
        id: 'm-target',
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
      } as WalletMember;

      walletMemberRepo.findByWalletAndUser.mockResolvedValue(targetMember);

      await service.kickMember(mockUserId, mockWalletId, mockTargetUserId);

      expect(walletMemberRepo.softDelete).toHaveBeenCalledWith('m-target');
      expect(walletGateway.removeSocketFromWalletRoom).toHaveBeenCalledWith(
        mockTargetUserId,
        mockWalletId,
      );
      expect(walletGateway.broadcastMemberRemoved).toHaveBeenCalledWith(
        mockWalletId,
        expect.objectContaining({ action: 'KICKED' }),
      );
    });

    it('nên ném lỗi CannotRemoveOwnerException nếu kick OWNER', async () => {
      walletRepo.findById.mockResolvedValue({
        id: mockWalletId,
        ownerId: mockUserId,
      } as Wallet);

      await expect(
        service.kickMember(mockUserId, mockWalletId, mockUserId),
      ).rejects.toThrow(CannotRemoveOwnerException);
    });
  });

  describe('leaveWallet', () => {
    it('nên cho phép EDITOR hoặc VIEWER tự rời ví', async () => {
      const editorMember = {
        id: 'm-editor',
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletMemberRepo.findByWalletAndUser.mockResolvedValue(editorMember);

      await service.leaveWallet(mockTargetUserId, mockWalletId);

      expect(walletMemberRepo.softDelete).toHaveBeenCalledWith('m-editor');
      expect(walletGateway.removeSocketFromWalletRoom).toHaveBeenCalledWith(
        mockTargetUserId,
        mockWalletId,
      );
      expect(walletGateway.broadcastMemberRemoved).toHaveBeenCalledWith(
        mockWalletId,
        expect.objectContaining({ action: 'LEFT' }),
      );
    });

    it('nên chặn OWNER tự rời ví khi chưa chuyển giao quyền', async () => {
      const ownerMember = {
        id: 'm-owner',
        userId: mockUserId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
      } as WalletMember;

      walletMemberRepo.findByWalletAndUser.mockResolvedValue(ownerMember);

      await expect(
        service.leaveWallet(mockUserId, mockWalletId),
      ).rejects.toThrow(CannotLeaveAsOwnerException);
    });
  });

  describe('handleWalletBalanceUpdated', () => {
    it('nên nhận event số dư và broadcast realtime vào room ví', async () => {
      usersService.findById.mockResolvedValue({
        id: mockUserId,
        fullName: 'Nguyễn Văn A',
        avatar: 'https://avatar.url',
      });

      const wallet = {
        id: mockWalletId,
        name: 'Ví nhóm',
        defaultCurrency: 'VND',
      } as Wallet;

      walletRepo.findById.mockResolvedValue(wallet);
      walletMemberRepo.findByWalletAndUser.mockResolvedValue({
        status: WalletMemberStatus.ACCEPTED,
        role: WalletMemberRole.OWNER,
      } as WalletMember);
      walletRepo.findAccountsByWalletId.mockResolvedValue([]);
      walletRepo.getBalancesByAccountIds.mockResolvedValue(new Map());

      const event = new WalletBalanceUpdatedEvent(
        mockWalletId,
        'acc-1',
        'tx-1',
        'EXPENSE',
        200000,
        mockUserId,
        1800000,
        'Ăn uống',
        'Ăn trưa cả nhóm',
      );

      await service.handleWalletBalanceUpdated(event);

      expect(walletGateway.broadcastBalanceUpdated).toHaveBeenCalledWith(
        mockWalletId,
        expect.objectContaining({
          walletId: mockWalletId,
          amount: 200000,
          actor: expect.objectContaining({ name: 'Nguyễn Văn A' }),
        }),
      );
    });
  });
});

