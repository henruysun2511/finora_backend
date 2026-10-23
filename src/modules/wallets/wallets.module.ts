import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { Account } from '../accounts/entities/account.entity';
import { WalletsController } from './wallets.controller';
import { WalletMembersController } from './controllers/wallet-members.controller';
import { WalletsService } from './wallets.service';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletMemberRepository } from './repositories/wallet-member.repository';
import { WalletMapper } from './mapper/wallet.mapper';
import { WalletGateway } from './gateways/wallet.gateway';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletMember, Account]),
    forwardRef(() => AuditLogsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [WalletsController, WalletMembersController],
  providers: [
    WalletsService,
    WalletRepository,
    WalletMemberRepository,
    WalletMapper,
    WalletGateway,
  ],
  exports: [WalletsService, WalletGateway],
})
export class WalletsModule {}
