import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Token } from './entities/token.entity';
import { TokenRepository } from './repositories/token.repository';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenRepository,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    GoogleAuthGuard,
    PassportModule,
  ],
})
export class AuthModule {}
