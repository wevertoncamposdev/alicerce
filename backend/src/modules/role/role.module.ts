import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RoleRepository } from './persistence/role.repository';

@Module({
    imports: [PrismaModule],
    controllers: [RolesController],
    providers: [
        RolesService,
        RoleRepository
    ],
    exports: [RolesService],
})
export class RoleModule { }