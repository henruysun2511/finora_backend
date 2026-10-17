import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { InfrastructuresModule } from './infrastructures/infrastructures.module';
import { UsersModule } from './modules/users/users.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authorization/guards/permissions.guard';

@Module({
  imports: [
    InfrastructuresModule,
    UsersModule,
    AuthorizationModule,
    AuthModule,
    WalletsModule,
    CategoriesModule,
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
