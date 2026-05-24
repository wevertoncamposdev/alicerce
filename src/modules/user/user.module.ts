import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { PrismaModule } from '@core/prisma/prisma.module';
import { UserMapper } from './mappers/user.mapper';
import { UserValidator } from './validators/user.validator';
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserRepository } from './persistence/repository/user.repository';
import { UserErrorMapper } from './mappers/user-error.mapper';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserMapper,
    UserValidator,
    UserBusinessRules,
    UserRepository,
    UserErrorMapper,
  ],
  exports: [UsersService],
})
export class UsersModule { }
