import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { WalletsService } from '../wallets.service';
import { InviteWalletMemberDto } from '../dto/request/invite-wallet-member.dto';
import { UpdateWalletMemberRoleDto } from '../dto/request/update-wallet-member-role.dto';
import { WalletMemberResponseDto } from '../dto/response/wallet-member-response.dto';
import { WalletMemberInviteResponseDto } from '../dto/response/wallet-member-invite-response.dto';
import { WalletResponseDto } from '../dto/response/wallet-response.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../../common/swagger/swagger-doc';
import { ApiResponse } from '../../../common/response/api-response';
import { Permissions } from '../../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../../common/constants/permission.constant';
import { Auditable } from '../../audit-logs/decorators/auditable.decorator';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../../audit-logs/audit-logs.constant';

@ApiTags('Wallet Members')
@Controller('wallets/:walletId/members')
@UseGuards(JwtAuthGuard)
export class WalletMembersController {
  constructor(private readonly walletsService: WalletsService) {}

  /**
   * POST /api/v1/wallets/:walletId/members/invite
   * Mời thành viên mới vào ví (Chỉ OWNER).
   */
  @Post('invite')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_MEMBER_INVITE)
  @Auditable({
    action: AUDIT_LOG_ACTION.MEMBER_INVITE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: (req, res) => res?.data?.id,
    walletId: 'walletId',
  })
  @SwaggerDoc({
    summary: 'Mời thành viên mới vào ví',
    description:
      'Gửi lời mời tham gia ví bằng email hoặc userId. Chỉ OWNER của ví mới có quyền thực hiện.',
    bodyType: InviteWalletMemberDto,
    responseType: WalletMemberInviteResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async invite(
    @CurrentUser('id') ownerId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Body() dto: InviteWalletMemberDto,
  ) {
    const data = await this.walletsService.inviteMember(
      ownerId,
      walletId,
      dto,
    );
    return ApiResponse.created(data, 'Gửi lời mời tham gia ví thành công');
  }

  /**
   * POST /api/v1/wallets/:walletId/members/accept
   * Chấp nhận lời mời tham gia ví.
   */
  @Post('accept')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @Auditable({
    action: AUDIT_LOG_ACTION.MEMBER_ACCEPT,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: (req) => req.user?.id,
    walletId: 'walletId',
  })
  @SwaggerDoc({
    summary: 'Chấp nhận lời mời tham gia ví',
    description:
      'Người nhận lời mời chấp nhận tham gia ví. Trạng thái ví được cập nhật thành isShared = true.',
    responseType: WalletResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async accept(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.walletsService.acceptInvite(userId, walletId);
    return ApiResponse.success(data, 'Tham gia ví thành công');
  }

  /**
   * POST /api/v1/wallets/:walletId/members/reject
   * Từ chối lời mời tham gia ví.
   */
  @Post('reject')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @Auditable({
    action: AUDIT_LOG_ACTION.DELETE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: (req) => req.user?.id,
    walletId: 'walletId',
  })
  @SwaggerDoc({
    summary: 'Từ chối lời mời tham gia ví',
    description: 'Người nhận lời mời từ chối tham gia ví.',
    status: 200,
    bearerAuth: true,
  })
  async reject(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    await this.walletsService.rejectInvite(userId, walletId);
    return ApiResponse.success(null, 'Từ chối lời mời tham gia ví thành công');
  }

  /**
   * GET /api/v1/wallets/:walletId/members
   * Lấy danh sách thành viên trong ví.
   */
  @Get()
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách thành viên trong ví',
    description:
      'Lấy danh sách tất cả thành viên trong ví. Dành cho mọi thành viên thuộc ví (OWNER, EDITOR, VIEWER).',
    responseType: WalletMemberResponseDto,
    isArray: true,
    status: 200,
    bearerAuth: true,
  })
  async getMembers(
    @CurrentUser('id') userId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.walletsService.getMembers(walletId, userId);
    return ApiResponse.success(data, 'Lấy danh sách thành viên thành công');
  }

  /**
   * PATCH /api/v1/wallets/:walletId/members/:userId/role
   * Cập nhật vai trò thành viên trong ví (Chỉ OWNER).
   */
  @Patch(':userId/role')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_MEMBER_ASSIGN_ROLE)
  @Auditable({
    action: AUDIT_LOG_ACTION.MEMBER_ROLE_CHANGE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: 'userId',
    walletId: 'walletId',
  })
  @SwaggerDoc({
    summary: 'Cập nhật vai trò thành viên trong ví',
    description:
      'Thay đổi vai trò của thành viên sang EDITOR hoặc VIEWER. Chỉ OWNER của ví mới có quyền thực hiện.',
    bodyType: UpdateWalletMemberRoleDto,
    responseType: WalletMemberResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async updateRole(
    @CurrentUser('id') ownerId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateWalletMemberRoleDto,
  ) {
    const data = await this.walletsService.updateMemberRole(
      ownerId,
      walletId,
      targetUserId,
      dto,
    );
    return ApiResponse.success(data, 'Cập nhật vai trò thành viên thành công');
  }

  /**
   * DELETE /api/v1/wallets/:walletId/members/:userId
   * Xóa thành viên khỏi ví (Chỉ OWNER).
   */
  @Delete(':userId')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_MEMBER_KICK)
  @Auditable({
    action: AUDIT_LOG_ACTION.MEMBER_REMOVE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: 'userId',
    walletId: 'walletId',
  })
  @SwaggerDoc({
    summary: 'Xóa thành viên khỏi ví',
    description:
      'Xóa (kick) một thành viên ra khỏi ví. Chỉ OWNER của ví mới có quyền thực hiện và không được xóa OWNER.',
    status: 200,
    bearerAuth: true,
  })
  async kick(
    @CurrentUser('id') ownerId: string,
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.walletsService.kickMember(ownerId, walletId, targetUserId);
    return ApiResponse.success(null, 'Xóa thành viên khỏi ví thành công');
  }
}
