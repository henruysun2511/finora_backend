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
} from '@nestjs/common';
import { UpdateWalletDto } from './dto/request/update-wallet.dto';
import { ApiTags } from '@nestjs/swagger';

import { WalletsService } from './wallets.service';

import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';

import {
  ApiResponse,
  PaginatedResponse,
} from '../../common/response/api-response';

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
  @SwaggerDoc({
    summary: 'Lấy danh sách ví',
    description:
      'Lấy danh sách ví mà người dùng hiện tại có quyền truy cập, hỗ trợ phân trang.',
    responseType: PaginatedResponse,
    bearerAuth: true,
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.walletsService.getWallets(
      userId,
      Number(page ?? 1),
      Number(limit ?? 10),
    );

    return ApiResponse.success(data, 'Lấy danh sách ví thành công');
  }

  @Get(':id')
  @SwaggerDoc({
    summary: 'Xem chi tiết ví',
    description: 'Lấy thông tin ví mà người dùng hiện tại có quyền truy cập.',
    responseType: WalletResponseDto,
    bearerAuth: true,
  })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') walletId: string,
  ) {
    const data = await this.walletsService.getWalletById(walletId, userId);

    return ApiResponse.success(data, 'Lấy thông tin ví thành công');
  }

  @Patch(':id')
  @SwaggerDoc({
    summary: 'Cập nhật ví',
    description: 'Chỉ chủ sở hữu ví mới được cập nhật thông tin.',
    bodyType: UpdateWalletDto,
    responseType: WalletResponseDto,
    bearerAuth: true,
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') walletId: string,
    @Body() dto: UpdateWalletDto,
  ) {
    const data = await this.walletsService.updateWallet(walletId, userId, dto);

    return ApiResponse.success(data, 'Cập nhật ví thành công');
  }

  @Delete(':id')
  @SwaggerDoc({
    summary: 'Xóa ví',
    description: 'Chỉ chủ sở hữu ví mới được xóa ví.',
    bearerAuth: true,
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') walletId: string,
  ) {
    await this.walletsService.deleteWallet(walletId, userId);

    return ApiResponse.noContent();
  }
}
