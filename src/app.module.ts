import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { InfrastructuresModule } from './infrastructures/infrastructures.module';
import { UsersModule } from './modules/users/users.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FriendsModule } from './modules/friends/friends.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authorization/guards/permissions.guard';
import { FeedModule } from './modules/feeds/feed.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { SplitExpensesModule } from './modules/split-expenses/split-expenses.module';
import { MessagesModule } from './modules/messages/messages.module';
@Module({
  imports: [
    InfrastructuresModule,
    UsersModule,
    AuthorizationModule,
    AuthModule,
    WalletsModule,
    CategoriesModule,
    AccountsModule,
    ExchangeRatesModule,
    TransfersModule,
    TransactionsModule,
    NotificationsModule,
    FriendsModule,
    FeedModule,
    BudgetsModule,
    SplitExpensesModule,
    MessagesModule,
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
export class AppModule { }
