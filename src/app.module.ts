import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './shared/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authorization/guards/permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthorizationModule,
    AuthModule,
    WalletsModule,
    AccountsModule,
    ExchangeRatesModule,
    TransfersModule,
  ],

  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}

