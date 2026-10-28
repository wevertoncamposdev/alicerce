import { Module } from '@nestjs/common';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';

import { PrismaModule } from '@core/prisma/prisma.module';
import { AccountTokenModule } from '@core/auth/account-token.module';
import { MailModule } from '@core/mail/mail.module';
import { FileModule } from '@core/files/file.module';

import { UserMapper } from './mappers/user.mapper';
import { UserErrorMapper } from './mappers/user-error.mapper';

import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserRepository } from './persistence/repository/user.repository';

import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    PrismaModule,
    RoleModule,
    AccountTokenModule,
    MailModule,
    FileModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserMapper,
    UserBusinessRules,
    UserRepository,
    UserErrorMapper,
  ],
  exports: [UsersService],
})
export class UsersModule {}
