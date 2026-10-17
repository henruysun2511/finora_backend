import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './shared/database/database.module';
import { ProductsModule } from './modules/sample/products.module';
import { UsersModule } from './modules/users/users.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [
    DatabaseModule,
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
  ],
})
export class AppModule {}
