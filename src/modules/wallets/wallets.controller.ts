import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/request/create-wallet.dto';
import { WalletResponseDto } from './dto/response/wallet-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SwaggerDoc } from '../../common/swagger/swagger-doc';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @SwaggerDoc({
    summary: 'Tạo ví tài chính mới',
    description:
      'Tạo mới một ví tài chính (cá nhân hoặc chia sẻ). Người tạo tự động được gán vai trò OWNER của ví.',
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
}
