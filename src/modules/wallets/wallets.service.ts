import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

import { Wallet } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletMemberRepository } from './repositories/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { WalletGateway } from './gateways/wallet.gateway';
import { WALLET_ERROR_CODE } from './wallets.constant';
import { AppError } from '../../common/errors/app.error';

import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { UpdateWalletDto } from './dto/request/update-wallet.dto';
import { WalletQueryDto } from './dto/request/wallet-query.dto';
import { InviteWalletMemberDto } from './dto/request/invite-wallet-member.dto';
import { UpdateWalletMemberRoleDto } from './dto/request/update-wallet-member-role.dto';
import { TransferOwnershipDto } from './dto/request/transfer-ownership.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import { WalletAccountResponseDto } from './dto/response/wallet-account-response.dto';
import { WalletBalanceResponseDto } from './dto/response/wallet-balance-response.dto';
import { WalletMemberResponseDto } from './dto/response/wallet-member-response.dto';
import { WalletMemberInviteResponseDto } from './dto/response/wallet-member-invite-response.dto';

import {
  WalletNotFoundException,
  WalletAccessDeniedException,
  WalletNameAlreadyExistsException,
  WalletMemberNotFoundException,
  WalletMemberAlreadyExistsException,
  CannotRemoveOwnerException,
  CannotLeaveAsOwnerException,
  WalletTargetNotMemberException,
  WalletMemberInviteNotFoundException,
  CannotModifyOwnerRoleException,
  WalletMemberSelfActionException,
} from './exceptions/wallet.exception';
import { UserNotFoundException } from '../users/exceptions/user.exception';

import {
  WalletMemberRole,
  WalletMemberStatus,
} from '../../common/enums/wallet-member-role.enum';

import { PaginatedResponse } from '../../common/response/api-response';
import {
  EVENT_WALLET_BALANCE_UPDATED,
  WalletBalanceUpdatedEvent,
} from './events/wallet-balance-updated.event';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletRepo: WalletRepository,
    private readonly walletMemberRepo: WalletMemberRepository,
    private readonly walletMapper: WalletMapper,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => WalletGateway))
    private readonly walletGateway: WalletGateway,
  ) {}

  // Tạo ví và tự động thêm người tạo làm OWNER.
  async createWallet(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    const existing = await this.walletRepo.findByNameAndOwnerId(
      dto.name,
      userId,
    );

    if (existing) {
      throw new WalletNameAlreadyExistsException(dto.name);
    }

    return this.dataSource.transaction(async (manager) => {
      const walletData = this.walletMapper.toEntity(dto, userId);
      const wallet = this.walletRepo.create(walletData);
      const savedWallet = await this.walletRepo.save(wallet, manager);

      const member = this.walletMemberRepo.create({
        walletId: savedWallet.id,
        userId,
        role: WalletMemberRole.OWNER,
        status: WalletMemberStatus.ACCEPTED,
        joinedAt: new Date(),
      });

      await this.walletMemberRepo.save(member, manager);

      return this.walletMapper.toResponse(
        savedWallet,
        WalletMemberRole.OWNER,
      );
    });
  }


  // Lấy danh sách ví có phân trang.
  async getWallets(
    userId: string,
    query: WalletQueryDto,
  ): Promise<PaginatedResponse<WalletResponseDto>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    const [wallets, total] = await this.walletRepo.findWalletsByUserIdPaginated(
      userId,
      safePage,
      safeLimit,
    );

    const roleMap = new Map<string, WalletMemberRole>();
    for (const wallet of wallets) {
      const currentMember = wallet.members?.find((m) => m.userId === userId);
      if (currentMember) {
        roleMap.set(wallet.id, currentMember.role);
      }
    }

    const items = this.walletMapper.toResponseList(wallets, roleMap);

    return PaginatedResponse.of(items, total, safePage, safeLimit);
  }

  // Kiểm tra người dùng có phải thành viên đã được chấp nhận không.
  private async getAcceptedMember(walletId: string, userId: string) {
    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.ACCEPTED
    ) {
      throw new WalletAccessDeniedException(walletId);
    }

    return member;
  }

  /**
   * Xem chi tiết ví theo ID.
   * [CROSS-MODULE]: Các module khác (như AccountsService, TransactionsService...) gọi hàm này
   * để xác thực quyền truy cập ví của người dùng trước khi thao tác dữ liệu (tạo tài khoản, giao dịch...).
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns WalletResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu user không có quyền truy cập
   */
  async getWalletById(
    walletId: string,
    userId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    return this.walletMapper.toResponse(wallet, member.role);
  }

  // Cập nhật thông tin ví: chỉ OWNER được phép.
  async updateWallet(
    walletId: string,
    userId: string,
    dto: UpdateWalletDto,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (dto.name && dto.name !== wallet.name) {
      const existing = await this.walletRepo.findByNameAndOwnerId(
        dto.name,
        wallet.ownerId,
      );

      if (existing && existing.id !== walletId) {
        throw new WalletNameAlreadyExistsException(dto.name);
      }
    }

    const oldValue = {
      name: wallet.name,
      icon: wallet.icon,
      description: wallet.description,
      defaultCurrency: wallet.defaultCurrency,
      isShared: wallet.isShared,
    };

    if (dto.name !== undefined) {
      wallet.name = dto.name;
    }

    if (dto.icon !== undefined) {
      wallet.icon = dto.icon;
    }

    if (dto.description !== undefined) {
      wallet.description = dto.description;
    }

    if (dto.defaultCurrency !== undefined) {
      wallet.defaultCurrency = dto.defaultCurrency;
    }

    if (dto.isShared !== undefined) {
      wallet.isShared = dto.isShared;
    }

    const savedWallet = await this.walletRepo.save(wallet);

    return this.walletMapper.toResponse(savedWallet, member.role);
  }

  // Xóa mềm ví: chỉ OWNER được phép.
  async deleteWallet(walletId: string, userId: string): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.getAcceptedMember(walletId, userId);

    if (member.role !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    await this.walletRepo.softDeleteById(walletId);
  }


  // ── [CROSS-MODULE SERVICE METHODS] ────────────────────────────────────────

  /**
   * [CROSS-MODULE] Kiểm tra ví có tồn tại hay không.
   *
   * @param walletId - UUID của ví
   * @returns boolean
   */
  async exists(walletId: string): Promise<boolean> {
    const wallet = await this.walletRepo.findById(walletId);
    return Boolean(wallet);
  }

  /**
   * [CROSS-MODULE] Tìm entity Wallet theo ID.
   *
   * @param walletId - UUID của ví
   * @returns Wallet entity hoặc null nếu không tồn tại
   */
  async findById(walletId: string): Promise<Wallet | null> {
    return this.walletRepo.findById(walletId);
  }

  /**
   * [CROSS-MODULE] Lấy vai trò thành viên của người dùng trong ví.
   * Trả về WalletMemberRole nếu là OWNER hoặc thành viên ACCEPTED, ngược lại trả về null.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng
   * @returns WalletMemberRole hoặc null
   */
  async getMemberRole(
    walletId: string,
    userId: string,
  ): Promise<WalletMemberRole | null> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      return null;
    }

    if (wallet.ownerId === userId) {
      return WalletMemberRole.OWNER;
    }

    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );
    if (
      member &&
      !member.deletedAt &&
      member.status === WalletMemberStatus.ACCEPTED
    ) {
      return member.role;
    }

    return null;
  }

  async assertWalletAccess(
    walletId: string,
    userId: string,
    mode: 'read' | 'write',
  ): Promise<void> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) throw new WalletNotFoundException(walletId);

    const role = await this.getMemberRole(walletId, userId);
    const canWrite =
      role === WalletMemberRole.OWNER || role === WalletMemberRole.EDITOR;
    if (!role || (mode === 'write' && !canWrite)) {
      throw new WalletAccessDeniedException(walletId);
    }
  }

  async getAcceptedMemberUserIds(walletId: string): Promise<string[]> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) throw new WalletNotFoundException(walletId);
    return [
      ...new Set([
        wallet.ownerId,
        ...(await this.walletMemberRepo.findAcceptedUserIds(walletId)),
      ]),
    ];
  }

  /**
   * [CROSS-MODULE] Lấy danh sách ID ví mà người dùng có quyền truy cập (owner hoặc thành viên).
   *
   * @param userId - UUID của người dùng
   * @returns Mảng các UUID của ví
   */
  async getUserWalletIds(userId: string): Promise<string[]> {
    const wallets = await this.walletRepo.findWalletsByUserId(userId);
    return wallets.map((w) => w.id);
  }

  /**
   * [CROSS-MODULE] Lấy danh sách các entity Wallet mà người dùng có quyền truy cập.
   *
   * @param userId - UUID của người dùng
   * @returns Mảng các Wallet entity
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findWalletsByUserId(userId);
  }

  /**
   * [CROSS-MODULE] Lấy danh sách tài khoản trong ví.
   * Dùng cho controller và các module ngoại vi (TransactionsService, BudgetsService...)
   * cần tra cứu danh sách tài khoản hợp lệ thuộc một ví sau khi đã xác thực quyền thành viên.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns Danh sách WalletAccountResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu người dùng không thuộc ví
   */
  async getWalletAccounts(
    walletId: string,
    userId: string,
  ): Promise<WalletAccountResponseDto[]> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    await this.getAcceptedMember(walletId, userId);

    const accounts = await this.walletRepo.findAccountsByWalletId(walletId);
    const accountIds = accounts.map((a) => a.id);
    const balanceMap =
      await this.walletRepo.getBalancesByAccountIds(accountIds);

    return this.walletMapper.toAccountResponseList(accounts, balanceMap);
  }

  /**
   * [CROSS-MODULE] Lấy tổng tài sản và thông tin số dư của ví.
   * Dùng cho controller và các module ngoại vi (DashboardService, ReportsService...)
   * cần tra cứu tổng số dư tài sản theo ví sau khi đã xác thực quyền thành viên.
   *
   * @param walletId - UUID của ví
   * @param userId - UUID của người dùng hiện tại
   * @returns WalletBalanceResponseDto
   * @throws WalletNotFoundException nếu ví không tồn tại
   * @throws WalletAccessDeniedException nếu người dùng không thuộc ví
   */
  async getWalletBalance(
    walletId: string,
    userId: string,
  ): Promise<WalletBalanceResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    await this.getAcceptedMember(walletId, userId);

    const accounts = await this.walletRepo.findAccountsByWalletId(walletId);
    const accountIds = accounts.map((a) => a.id);
    const balanceMap =
      await this.walletRepo.getBalancesByAccountIds(accountIds);

    return this.walletMapper.toBalanceResponse(wallet, accounts, balanceMap);
  }

  // ── [SHARED WALLET MEMBER MANAGEMENT] ──────────────────────────────────────

  /**
   * Mời một người dùng tham gia vào ví (Chỉ OWNER được phép).
   */
  async inviteMember(
    ownerId: string,
    walletId: string,
    dto: InviteWalletMemberDto,
  ): Promise<WalletMemberInviteResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const ownerRole = await this.getMemberRole(walletId, ownerId);
    if (ownerRole !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (!dto.email && !dto.userId) {
      throw new AppError({
        code: WALLET_ERROR_CODE.ACCESS_DENIED,
        message: 'Vui lòng cung cấp email hoặc userId của người được mời',
        statusCode: 400,
      });
    }

    let targetUser = dto.userId
      ? await this.usersService.findById(dto.userId)
      : null;

    if (!targetUser && dto.email) {
      targetUser = await this.usersService.findByEmail(dto.email);
    }

    if (!targetUser) {
      throw new UserNotFoundException(dto.email || dto.userId || '');
    }

    if (targetUser.id === ownerId) {
      throw new WalletMemberSelfActionException(
        'Bạn không thể tự gửi lời mời tham gia ví cho chính mình',
      );
    }

    const existingMember = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      targetUser.id,
    );

    if (existingMember && !existingMember.deletedAt) {
      if (existingMember.status === WalletMemberStatus.ACCEPTED) {
        throw new WalletMemberAlreadyExistsException(targetUser.id);
      }
      if (existingMember.status === WalletMemberStatus.PENDING) {
        throw new AppError({
          code: WALLET_ERROR_CODE.MEMBER_ALREADY_EXISTS,
          message: 'Người dùng này đã có một lời mời đang chờ phản hồi',
          statusCode: 409,
        });
      }
    }

    const roleToAssign = dto.role ?? WalletMemberRole.VIEWER;
    let savedMember: WalletMember;

    if (existingMember) {
      existingMember.role = roleToAssign;
      existingMember.status = WalletMemberStatus.PENDING;
      existingMember.joinedAt = undefined;
      existingMember.deletedAt = undefined;
      savedMember = await this.walletMemberRepo.save(existingMember);
    } else {
      const newMember = this.walletMemberRepo.create({
        walletId,
        userId: targetUser.id,
        role: roleToAssign,
        status: WalletMemberStatus.PENDING,
      });
      savedMember = await this.walletMemberRepo.save(newMember);
    }

    try {
      await this.notificationsService.createNotification({
        userId: targetUser.id,
        type: NotificationType.WALLET_INVITE,
        title: 'Lời mời tham gia ví',
        body: `Bạn vừa nhận được lời mời tham gia ví "${wallet.name}" với vai trò ${roleToAssign.toUpperCase()}`,
        relatedEntityType: 'WALLET',
        relatedEntityId: wallet.id,
      });
    } catch (err: any) {
      this.logger.warn(`Không thể gửi notification mời ví: ${err.message}`);
    }

    this.walletGateway.sendMemberInvited(targetUser.id, {
      walletId: wallet.id,
      walletName: wallet.name,
      role: roleToAssign,
      invitedBy: {
        id: ownerId,
        name: wallet.owner?.fullName ?? 'Chủ ví',
        avatar: wallet.owner?.avatar,
      },
      invitedAt: savedMember.createdAt,
    });

    return this.walletMapper.toMemberInviteResponse(savedMember);
  }

  /**
   * Chấp nhận lời mời tham gia ví (Kích hoạt status ACCEPTED, bật isShared).
   */
  async acceptInvite(
    userId: string,
    walletId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.PENDING
    ) {
      throw new WalletMemberInviteNotFoundException(walletId);
    }

    await this.dataSource.transaction(async (manager) => {
      member.status = WalletMemberStatus.ACCEPTED;
      member.joinedAt = new Date();
      await this.walletMemberRepo.save(member, manager);

      if (!wallet.isShared) {
        wallet.isShared = true;
        await this.walletRepo.save(wallet, manager);
      }
    });

    await this.walletGateway.addSocketToWalletRoom(userId, walletId);

    const fullMember = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    this.walletGateway.broadcastMemberJoined(walletId, {
      walletId,
      member: fullMember
        ? this.walletMapper.toMemberResponse(fullMember)
        : { userId, role: member.role, joinedAt: member.joinedAt },
    });

    return this.walletMapper.toResponse(wallet, member.role);
  }

  /**
   * Từ chối lời mời tham gia ví.
   */
  async rejectInvite(userId: string, walletId: string): Promise<void> {
    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.PENDING
    ) {
      throw new WalletMemberInviteNotFoundException(walletId);
    }

    member.status = WalletMemberStatus.REJECTED;
    await this.walletMemberRepo.save(member);
  }

  /**
   * Lấy danh sách thành viên trong ví (Dành cho mọi thành viên trong ví).
   */
  async getMembers(
    walletId: string,
    userId: string,
  ): Promise<WalletMemberResponseDto[]> {
    const callerRole = await this.getMemberRole(walletId, userId);
    if (!callerRole) {
      throw new WalletAccessDeniedException(walletId);
    }

    const members = await this.walletMemberRepo.findByWalletId(walletId);
    const activeMembers = members.filter((m) => !m.deletedAt);
    return this.walletMapper.toMemberResponseList(activeMembers);
  }

  /**
   * Cập nhật vai trò thành viên trong ví (Chỉ OWNER được phép).
   */
  async updateMemberRole(
    ownerId: string,
    walletId: string,
    targetUserId: string,
    dto: UpdateWalletMemberRoleDto,
  ): Promise<WalletMemberResponseDto> {
    const ownerRole = await this.getMemberRole(walletId, ownerId);
    if (ownerRole !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (targetUserId === ownerId) {
      throw new CannotModifyOwnerRoleException();
    }

    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      targetUserId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.ACCEPTED
    ) {
      throw new WalletTargetNotMemberException(targetUserId);
    }

    if (member.role === WalletMemberRole.OWNER) {
      throw new CannotModifyOwnerRoleException();
    }

    const oldRole = member.role;
    member.role = dto.role;
    const saved = await this.walletMemberRepo.save(member);

    this.walletGateway.broadcastMemberRoleUpdated(walletId, {
      walletId,
      userId: targetUserId,
      newRole: dto.role,
      updatedBy: { id: ownerId },
    });

    return this.walletMapper.toMemberResponse(saved);
  }

  /**
   * Chuyển quyền Chủ sở hữu ví (Trong 1 DB Transaction ACID).
   */
  async transferOwnership(
    currentOwnerId: string,
    walletId: string,
    dto: TransferOwnershipDto,
  ): Promise<WalletResponseDto> {
    if (dto.newOwnerId === currentOwnerId) {
      throw new WalletMemberSelfActionException(
        'Bạn hiện đã là chủ sở hữu của ví này',
      );
    }

    const ownerRole = await this.getMemberRole(walletId, currentOwnerId);
    if (ownerRole !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    const updatedWallet = await this.dataSource.transaction(
      async (manager) => {
        const wallet = await this.walletRepo.findByIdForUpdate(
          walletId,
          manager,
        );
        if (!wallet) {
          throw new WalletNotFoundException(walletId);
        }

        const targetMember =
          await this.walletMemberRepo.findByWalletAndUserForUpdate(
            walletId,
            dto.newOwnerId,
            manager,
          );

        if (
          !targetMember ||
          targetMember.deletedAt ||
          targetMember.status !== WalletMemberStatus.ACCEPTED
        ) {
          throw new WalletTargetNotMemberException(dto.newOwnerId);
        }

        const currentMember =
          await this.walletMemberRepo.findByWalletAndUserForUpdate(
            walletId,
            currentOwnerId,
            manager,
          );

        // 1. Chuyển người nhận thành OWNER
        targetMember.role = WalletMemberRole.OWNER;
        await this.walletMemberRepo.save(targetMember, manager);

        // 2. Chuyển chủ cũ thành EDITOR
        if (currentMember) {
          currentMember.role = WalletMemberRole.EDITOR;
          await this.walletMemberRepo.save(currentMember, manager);
        }

        // 3. Cập nhật ví ownerId
        wallet.ownerId = dto.newOwnerId;
        return this.walletRepo.save(wallet, manager);
      },
    );

    this.walletGateway.broadcastMemberRoleUpdated(walletId, {
      walletId,
      userId: dto.newOwnerId,
      newRole: WalletMemberRole.OWNER,
      updatedBy: { id: currentOwnerId },
    });
    this.walletGateway.broadcastMemberRoleUpdated(walletId, {
      walletId,
      userId: currentOwnerId,
      newRole: WalletMemberRole.EDITOR,
      updatedBy: { id: currentOwnerId },
    });

    return this.walletMapper.toResponse(updatedWallet, WalletMemberRole.EDITOR);
  }

  /**
   * Xóa thành viên khỏi ví (Kick Member - Chỉ OWNER được phép).
   */
  async kickMember(
    ownerId: string,
    walletId: string,
    targetUserId: string,
  ): Promise<void> {
    if (targetUserId === ownerId) {
      throw new CannotRemoveOwnerException();
    }

    const ownerRole = await this.getMemberRole(walletId, ownerId);
    if (ownerRole !== WalletMemberRole.OWNER) {
      throw new WalletAccessDeniedException(walletId);
    }

    const targetMember = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      targetUserId,
    );

    if (!targetMember || targetMember.deletedAt) {
      throw new WalletMemberNotFoundException(targetUserId);
    }

    if (targetMember.role === WalletMemberRole.OWNER) {
      throw new CannotRemoveOwnerException();
    }

    await this.walletMemberRepo.softDelete(targetMember.id);
    await this.walletGateway.removeSocketFromWalletRoom(targetUserId, walletId);

    this.walletGateway.broadcastMemberRemoved(walletId, {
      walletId,
      removedUserId: targetUserId,
      action: 'KICKED',
      actorId: ownerId,
    });
  }

  /**
   * Tự rời khỏi ví (Leave Wallet - Thành viên khác ngoài OWNER).
   */
  async leaveWallet(userId: string, walletId: string): Promise<void> {
    const member = await this.walletMemberRepo.findByWalletAndUser(
      walletId,
      userId,
    );

    if (
      !member ||
      member.deletedAt ||
      member.status !== WalletMemberStatus.ACCEPTED
    ) {
      throw new WalletAccessDeniedException(walletId);
    }

    if (member.role === WalletMemberRole.OWNER) {
      throw new CannotLeaveAsOwnerException();
    }

    await this.walletMemberRepo.softDelete(member.id);
    await this.walletGateway.removeSocketFromWalletRoom(userId, walletId);

    this.walletGateway.broadcastMemberRemoved(walletId, {
      walletId,
      removedUserId: userId,
      action: 'LEFT',
      actorId: userId,
    });
  }

  // ── [REALTIME EVENT LISTENER] ─────────────────────────────────────────────

  /**
   * Lắng nghe biến động số dư từ TransactionsService để broadcast realtime vào room ví.
   */
  @OnEvent(EVENT_WALLET_BALANCE_UPDATED, { async: true })
  async handleWalletBalanceUpdated(event: WalletBalanceUpdatedEvent) {
    try {
      const actor = await this.usersService.findById(event.actorId);
      const balanceInfo = await this.getWalletBalance(
        event.walletId,
        event.actorId,
      );

      this.walletGateway.broadcastBalanceUpdated(event.walletId, {
        walletId: event.walletId,
        accountId: event.accountId,
        transactionId: event.transactionId,
        type: event.type,
        amount: event.amount,
        actor: {
          id: event.actorId,
          name: actor?.fullName ?? 'Thành viên',
          avatar: actor?.avatar,
        },
        accountBalanceAfter: event.accountBalanceAfter,
        walletTotalBalance: balanceInfo.totalBalance,
        categoryName: event.categoryName,
        note: event.note,
        timestamp: event.timestamp,
      });
    } catch (err: any) {
      this.logger.warn(
        `Lỗi khi broadcast số dư ví realtime (${event.walletId}): ${err.message}`,
      );
    }
  }
}

