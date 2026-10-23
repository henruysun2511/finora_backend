import { Test, TestingModule } from '@nestjs/testing';
import { WalletMembersController } from '../../src/modules/wallets/controllers/wallet-members.controller';
import { WalletsService } from '../../src/modules/wallets/wallets.service';
import { InviteWalletMemberDto } from '../../src/modules/wallets/dto/request/invite-wallet-member.dto';
import { UpdateWalletMemberRoleDto } from '../../src/modules/wallets/dto/request/update-wallet-member-role.dto';
import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../src/common/enums/wallet-member-role.enum';
import { WalletMemberResponseDto } from '../../src/modules/wallets/dto/response/wallet-member-response.dto';
import { WalletMemberInviteResponseDto } from '../../src/modules/wallets/dto/response/wallet-member-invite-response.dto';
import { WalletResponseDto } from '../../src/modules/wallets/dto/response/wallet-response.dto';

describe('WalletMembersController', () => {
  let controller: WalletMembersController;
  let service: jest.Mocked<Partial<WalletsService>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockWalletId = '22222222-2222-2222-2222-222222222222';
  const mockTargetUserId = '33333333-3333-3333-3333-333333333333';
  const mockDate = new Date('2026-10-19T00:00:00.000Z');

  const mockMemberResponse: WalletMemberResponseDto = {
    id: 'member-uuid',
    userId: mockTargetUserId,
    fullName: 'Nguyễn Văn Bạn',
    email: 'friend@finora.io',
    role: WalletMemberRole.EDITOR,
    status: WalletMemberStatus.ACCEPTED,
    joinedAt: mockDate,
    createdAt: mockDate,
  };

  beforeEach(async () => {
    service = {
      inviteMember: jest.fn(),
      acceptInvite: jest.fn(),
      rejectInvite: jest.fn(),
      getMembers: jest.fn(),
      updateMemberRole: jest.fn(),
      kickMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletMembersController],
      providers: [
        {
          provide: WalletsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<WalletMembersController>(WalletMembersController);
  });

  describe('invite', () => {
    it('nên gửi lời mời thành công và trả về ApiResponse dạng created', async () => {
      const dto: InviteWalletMemberDto = {
        email: 'friend@finora.io',
        role: WalletMemberRole.EDITOR,
      };

      const mockInviteResponse: WalletMemberInviteResponseDto = {
        id: 'invite-uuid',
        walletId: mockWalletId,
        userId: mockTargetUserId,
        role: WalletMemberRole.EDITOR,
        status: WalletMemberStatus.PENDING,
        createdAt: mockDate,
      };

      service.inviteMember.mockResolvedValue(mockInviteResponse);

      const res = await controller.invite(mockUserId, mockWalletId, dto);

      expect(service.inviteMember).toHaveBeenCalledWith(
        mockUserId,
        mockWalletId,
        dto,
      );
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(res.data).toEqual(mockInviteResponse);
    });
  });

  describe('accept', () => {
    it('nên chấp nhận lời mời và trả về ví tham gia', async () => {
      const mockWalletResponse: WalletResponseDto = {
        id: mockWalletId,
        name: 'Ví nhóm',
        defaultCurrency: 'VND',
        isShared: true,
        isActive: true,
        ownerId: mockUserId,
        currentUserRole: WalletMemberRole.EDITOR,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      service.acceptInvite.mockResolvedValue(mockWalletResponse);

      const res = await controller.accept(mockTargetUserId, mockWalletId);

      expect(service.acceptInvite).toHaveBeenCalledWith(
        mockTargetUserId,
        mockWalletId,
      );
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockWalletResponse);
    });
  });

  describe('reject', () => {
    it('nên từ chối lời mời thành công', async () => {
      service.rejectInvite.mockResolvedValue(undefined);

      const res = await controller.reject(mockTargetUserId, mockWalletId);

      expect(service.rejectInvite).toHaveBeenCalledWith(
        mockTargetUserId,
        mockWalletId,
      );
      expect(res.success).toBe(true);
    });
  });

  describe('getMembers', () => {
    it('nên lấy danh sách thành viên trong ví thành công', async () => {
      service.getMembers.mockResolvedValue([mockMemberResponse]);

      const res = await controller.getMembers(mockUserId, mockWalletId);

      expect(service.getMembers).toHaveBeenCalledWith(mockWalletId, mockUserId);
      expect(res.success).toBe(true);
      expect(res.data).toEqual([mockMemberResponse]);
    });
  });

  describe('updateRole', () => {
    it('nên cập nhật vai trò thành viên thành công', async () => {
      const dto: UpdateWalletMemberRoleDto = {
        role: WalletMemberRole.VIEWER,
      };

      service.updateMemberRole.mockResolvedValue({
        ...mockMemberResponse,
        role: WalletMemberRole.VIEWER,
      });

      const res = await controller.updateRole(
        mockUserId,
        mockWalletId,
        mockTargetUserId,
        dto,
      );

      expect(service.updateMemberRole).toHaveBeenCalledWith(
        mockUserId,
        mockWalletId,
        mockTargetUserId,
        dto,
      );
      expect(res.success).toBe(true);
      expect(res.data.role).toBe(WalletMemberRole.VIEWER);
    });
  });

  describe('kick', () => {
    it('nên kick thành viên ra khỏi ví thành công', async () => {
      service.kickMember.mockResolvedValue(undefined);

      const res = await controller.kick(
        mockUserId,
        mockWalletId,
        mockTargetUserId,
      );

      expect(service.kickMember).toHaveBeenCalledWith(
        mockUserId,
        mockWalletId,
        mockTargetUserId,
      );
      expect(res.success).toBe(true);
    });
  });
});
