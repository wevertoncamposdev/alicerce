import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
@UseGuards(RolesPermissionsGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    @Get()
    @Roles('ADMIN')
    @Permissions('permission.read')
    findAll(@Query('tenantId') tenantId: string) {
        return this.permissionsService.findAll(tenantId);
    }

    @Post()
    @Roles('ADMIN')
    @Permissions('permission.create')
    create(@Body() dto: CreatePermissionDto) {
        return this.permissionsService.create(dto);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @Permissions('permission.update')
    update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
        return this.permissionsService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @Permissions('permission.delete')
    remove(@Param('id') id: string) {
        return this.permissionsService.remove(id);
    }
}
