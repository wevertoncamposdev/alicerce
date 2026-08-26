import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Search,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SearchPermissionDto } from './dto/search-permission.dto';

@ApiTags('permissions')
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

    @Get(':id')
    @Roles('ADMIN')
    @Permissions('permission.read')
    findOne(@Param('id') id: string) {
        return this.permissionsService.findOne(id);
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

    @Search()
    @Roles('ADMIN')
    @Permissions('permission.read')
    @ApiOperation({ summary: 'Search permissions' })
    @ApiResponse({ status: 200, description: 'Search results' })
    @ApiBody({ schema: { type: 'object' } })
    search(@Body() query: SearchPermissionDto) {
        return this.permissionsService.search(query);
    }

    //Roles

    @Get(':id/roles')
    @Roles('ADMIN')
    @Permissions('permission.read')
    listRoles(@Param('id') id: string, @Query('tenantId') tenantId: string) {
        return this.permissionsService.findRolesOfPermission(id, tenantId);
    }
}
