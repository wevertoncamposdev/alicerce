import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { PrismaModule } from '@core/prisma/prisma.module';
import { UserMapper } from './mappers/user.mapper';
import { UserValidator } from './validators/user.validator';
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserRepository } from './persistence/repository/user.repository';
import { UserErrorMapper } from './mappers/user-error.mapper';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    UserMapper,
    UserValidator,
    UserBusinessRules,
    UserRepository,
    UserErrorMapper,
  ],
  exports: [UsersService],
})
export class UsersModule { }
