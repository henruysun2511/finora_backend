// src/modules/accounts/dto/response/account-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '../../enums/account-type.enum';

export class AccountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() walletId: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: AccountType }) type: AccountType;
  @ApiProperty() currency: string;
  @ApiProperty() balance: number;
  @ApiProperty() isArchived: boolean;
  @ApiPropertyOptional() accountNumberLast4?: string | null;
  @ApiPropertyOptional() icon?: string | null;
  @ApiPropertyOptional() color?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AccountDetailDto extends AccountResponseDto {
  @ApiProperty() initialBalance: number;
  @ApiPropertyOptional() archivedAt?: Date | null;
  @ApiPropertyOptional() createdBy?: string | null;
}

export class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedAccountsDto {
  @ApiProperty({ type: [AccountResponseDto] }) items: AccountResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}