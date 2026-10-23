import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { UpdateWalletDto } from './dto/request/update-wallet.dto';
import { WalletQueryDto } from './dto/request/wallet-query.dto';
import { TransferOwnershipDto } from './dto/request/transfer-ownership.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import { WalletAccountResponseDto } from './dto/response/wallet-account-response.dto';
import { WalletBalanceResponseDto } from './dto/response/wallet-balance-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { Auditable } from '../audit-logs/decorators/auditable.decorator';
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_ENTITY_TYPE,
} from '../audit-logs/audit-logs.constant';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  /**
   * POST /api/v1/wallets
   * Tạo ví mới.
   */
  @Post()
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_CREATE)
  @Auditable({
    action: AUDIT_LOG_ACTION.CREATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET,
  })
  @SwaggerDoc({
    summary: 'Tạo ví tài chính mới',
    description:
      'Tạo một ví tài chính. Người tạo tự động được gán vai trò OWNER.',
    bodyType: CreateWalletDto,
    responseType: WalletResponseDto,
    status: 201,
    bearerAuth: true,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWalletDto,
  ) {
    const data = await this.walletsService.createWallet(userId, dto);

    return ApiResponse.created(data, 'Tạo ví mới thành công');
  }

  /**
   * GET /api/v1/wallets?page=1&limit=10
   * Lấy danh sách ví có phân trang.
   */
  @Get()
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách ví',
    description:
      'Lấy danh sách ví mà người dùng hiện tại có quyền truy cập, hỗ trợ phân trang.',
    responseType: WalletResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: WalletQueryDto,
  ) {
    const data = await this.walletsService.getWallets(userId, query);

    return ApiResponse.success(data, 'Lấy danh sách ví thành công');
  }

  @Get(':id')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Xem chi tiết ví',
    description: 'Lấy thông tin ví mà người dùng hiện tại có quyền truy cập.',
    responseType: WalletResponseDto,
    bearerAuth: true,
  })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.walletsService.getWalletById(walletId, userId);

    return ApiResponse.success(data, 'Lấy thông tin ví thành công');
  }

  @Patch(':id')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_UPDATE)
  @Auditable({
    action: AUDIT_LOG_ACTION.WALLET_UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET,
    entityId: 'id',
    walletId: 'id',
  })
  @SwaggerDoc({
    summary: 'Cập nhật ví',
    description: 'Chỉ chủ sở hữu ví mới được cập nhật thông tin.',
    bodyType: UpdateWalletDto,
    responseType: WalletResponseDto,
    bearerAuth: true,
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body() dto: UpdateWalletDto,
  ) {
    const data = await this.walletsService.updateWallet(walletId, userId, dto);

    return ApiResponse.success(data, 'Cập nhật ví thành công');
  }

  @Delete(':id')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_DELETE)
  @Auditable({
    action: AUDIT_LOG_ACTION.WALLET_DELETE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET,
    entityId: 'id',
    walletId: 'id',
  })
  @SwaggerDoc({
    summary: 'Xóa ví',
    description: 'Chỉ chủ sở hữu ví mới được xóa ví.',
    bearerAuth: true,
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
  ) {
    await this.walletsService.deleteWallet(walletId, userId);

    return ApiResponse.noContent('Xóa ví thành công');
  }

  @Get(':id/accounts')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Lấy danh sách tài khoản trong ví',
    description:
      'Lấy toàn bộ các tài khoản nguồn tiền thuộc ví mà người dùng có quyền truy cập.',
    responseType: WalletAccountResponseDto,
    isArray: true,
    bearerAuth: true,
  })
  async getAccounts(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.walletsService.getWalletAccounts(walletId, userId);

    return ApiResponse.success(
      data,
      'Lấy danh sách tài khoản trong ví thành công',
    );
  }

  @Get(':id/balance')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @SwaggerDoc({
    summary: 'Lấy tổng tài sản của ví',
    description:
      'Tính toán tổng số dư và thống kê số dư theo tiền tệ của các tài khoản trong ví.',
    responseType: WalletBalanceResponseDto,
    bearerAuth: true,
  })
  async getBalance(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
  ) {
    const data = await this.walletsService.getWalletBalance(walletId, userId);

    return ApiResponse.success(data, 'Lấy tổng tài sản ví thành công');
  }

  /**
   * POST /api/v1/wallets/:id/transfer-ownership
   * Chuyển quyền Chủ sở hữu ví (Chỉ OWNER).
   */
  @Post(':id/transfer-ownership')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_TRANSFER_OWNERSHIP)
  @Auditable({
    action: AUDIT_LOG_ACTION.UPDATE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET,
    entityId: 'id',
    walletId: 'id',
  })
  @SwaggerDoc({
    summary: 'Chuyển quyền Chủ sở hữu ví',
    description:
      'Chuyển quyền OWNER cho một thành viên khác trong ví. Chủ sở hữu cũ sẽ được chuyển thành EDITOR.',
    bodyType: TransferOwnershipDto,
    responseType: WalletResponseDto,
    status: 200,
    bearerAuth: true,
  })
  async transferOwnership(
    @CurrentUser('id') currentOwnerId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    const data = await this.walletsService.transferOwnership(
      currentOwnerId,
      walletId,
      dto,
    );

    return ApiResponse.success(
      data,
      'Chuyển giao quyền chủ sở hữu ví thành công',
    );
  }

  /**
   * POST /api/v1/wallets/:id/leave
   * Tự rời khỏi ví (Thành viên EDITOR / VIEWER).
   */
  @Post(':id/leave')
  @Permissions(SYSTEM_PERMISSIONS.WALLETS_READ)
  @Auditable({
    action: AUDIT_LOG_ACTION.MEMBER_REMOVE,
    entityType: AUDIT_LOG_ENTITY_TYPE.WALLET_MEMBER,
    entityId: (req) => req.user?.id,
    walletId: 'id',
  })
  @SwaggerDoc({
    summary: 'Tự rời khỏi ví',
    description:
      'Thành viên (EDITOR hoặc VIEWER) tự rời khỏi ví. OWNER không thể tự rời ví mà phải chuyển giao quyền trước.',
    status: 200,
    bearerAuth: true,
  })
  async leave(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) walletId: string,
  ) {
    await this.walletsService.leaveWallet(userId, walletId);

    return ApiResponse.success(null, 'Rời khỏi ví thành công');
  }
}
