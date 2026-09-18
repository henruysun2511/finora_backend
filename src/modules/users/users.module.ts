import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRepository } from './repository/user.repository';
import { UserRoleRepository } from './repository/user-role.repository';
import { UserMapper } from './mapper/user.mapper';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole])],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, UserRoleRepository, UserMapper],
  exports: [UsersService, UserRepository, UserRoleRepository, UserMapper],
})
export class UsersModule {}
