// src/modules/transfers/transfers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from './entities/transfer.entity';
import { TransferRepository } from './repositories/transfer.repository';
import { TransferMapper } from './mapper/transfer.mapper';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transfer]),
    AccountsModule,
    ExchangeRatesModule,
    AuditLogsModule,
  ],
  controllers: [TransfersController],
  providers: [
    TransferRepository,
    TransferMapper,
    TransfersService,
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
