// src/modules/exchange-rates/exchange-rates.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse as SwaggerResponse, ApiTags } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { ConvertQueryDto } from './dto/request/exchange-rate-query.dto';
import {
  ConvertCurrencyResponseDto,
  ExchangeRateResponseDto,
} from './dto/response/exchange-rate-response.dto';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { SYSTEM_PERMISSIONS } from '../../common/constants/permission.constant';
import { ApiResponse } from '../../common/response/api-response';

@ApiTags('Exchange Rates')
@ApiBearerAuth('access-token')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get(':from/:to')
  @Permissions(SYSTEM_PERMISSIONS.EXCHANGE_RATES_READ)
  @ApiOperation({
    summary: 'Lấy tỷ giá hiện tại giữa 2 đồng tiền hoặc tính toán quy đổi số tiền',
    description:
      'Trả về tỷ giá từ đồng tiền nguồn sang đích. Nếu truyền thêm query ?amount=..., trả về luôn số tiền quy đổi nhận được.',
  })
  @ApiParam({ name: 'from', example: 'VND', description: 'Mã tiền tệ gốc (ISO 3 ký tự)' })
  @ApiParam({ name: 'to', example: 'USD', description: 'Mã tiền tệ đích (ISO 3 ký tự)' })
  @SwaggerResponse({
    status: 200,
    description: 'Lấy tỷ giá / quy đổi thành công',
    type: ExchangeRateResponseDto,
  })
  async getExchangeRate(
    @Param('from') from: string,
    @Param('to') to: string,
    @Query() query: ConvertQueryDto,
  ): Promise<ApiResponse<ExchangeRateResponseDto | ConvertCurrencyResponseDto>> {
    if (query.amount !== undefined) {
      const data = await this.exchangeRatesService.convert(query.amount, from, to);
      return ApiResponse.success(data, 'Tính toán quy đổi tiền tệ thành công');
    }

    const data = await this.exchangeRatesService.getExchangeRate(from, to);
    return ApiResponse.success(data, 'Lấy tỷ giá thành công');
  }
}
