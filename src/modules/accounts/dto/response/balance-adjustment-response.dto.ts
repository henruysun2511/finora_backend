// src/modules/accounts/dto/response/balance-adjustment-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BalanceDirection } from '../../../../modules/accounts/enums/balance-direction.enum';

export class BalanceAdjustmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() accountId: string;
  @ApiProperty({ enum: BalanceDirection }) direction: BalanceDirection;
  @ApiProperty() amount: number;
  @ApiProperty() balanceBefore: number;
  @ApiProperty() balanceAfter: number;
  @ApiProperty() currency: string;
  @ApiProperty() reason: string;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
}