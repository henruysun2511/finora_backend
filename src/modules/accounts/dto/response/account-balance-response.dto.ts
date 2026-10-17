// src/modules/accounts/dto/response/account-balance-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AccountBalanceResponseDto {
  @ApiProperty() accountId: string;
  @ApiProperty() balance: number;
  @ApiProperty() currency: string;
  @ApiProperty() isArchived: boolean;
  @ApiProperty() asOf: Date;
}