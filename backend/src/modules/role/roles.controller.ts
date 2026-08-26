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
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';


import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AttachRoleUserDto } from './dto/attach-role-user.dto';
import { AttachRolePermissionDto } from './dto/attach-role-permission.dto';
import { SearchRoleDto } from './dto/search-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
@UseGuards(RolesPermissionsGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @Roles('ADMIN')
    @Permissions('role.read')
    findAll(@Query('tenantId') tenantId: string) {
        return this.rolesService.findAll(tenantId);
    }

    @Get(':id')
    @Roles('ADMIN')
    @Permissions('role.read')
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN')
    @Permissions('role.create')
    create(@Body() dto: CreateRoleDto) {
        return this.rolesService.create(dto);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @Permissions('role.update')
    update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
        return this.rolesService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @Permissions('role.delete')
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    @Post(':id/users')
    @Roles('ADMIN')
    @Permissions('role.assign')
    attachUser(@Param('id') id: string, @Body() dto: AttachRoleUserDto) {
        return this.rolesService.attachUser(id, dto.tenantId, dto.userId);
    }

    @Delete(':id/users/:userId')
    @Roles('ADMIN')
    @Permissions('role.assign')
    detachUser(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Query('tenantId') tenantId: string,
    ) {
        return this.rolesService.detachUser(id, tenantId, userId);
    }

    @Post(':id/permissions')
    @Roles('ADMIN')
    @Permissions('role.assign')
    attachPermission(@Param('id') id: string, @Body() dto: AttachRolePermissionDto) {
        return this.rolesService.attachPermission(id, dto.tenantId, dto.permissionId, dto.resource);
    }

    @Delete(':id/permissions/:permissionId')
    @Roles('ADMIN')
    @Permissions('role.assign')
    detachPermission(
        @Param('id') id: string,
        @Param('permissionId') permissionId: string,
        @Query('tenantId') tenantId: string,
    ) {
        return this.rolesService.detachPermission(id, tenantId, permissionId);
    }

    @Search()
    @Roles('ADMIN')
    @Permissions('role.read') // ou 'permission.read'
    @ApiOperation({ summary: 'Search roles' })
    @ApiResponse({ status: 200, description: 'Search results' })
    @ApiBody({ schema: { type: 'object' } })
    search(@Body() query: SearchRoleDto) { // ou SearchPermissionDto
        return this.rolesService.search(query); // implementar em roles.service.ts, espelhando tenant.service.ts
    }

    @Get(':id/permissions')
    @Roles('ADMIN')
    @Permissions('role.read')
    @ApiOperation({ summary: 'List permissions of a role' })
    @ApiResponse({ status: 200, description: 'List of permissions' })
    listPermissions(@Param('id') id: string, @Query('tenantId') tenantId: string) {
        return this.rolesService.findPermissionsOfRole(id, tenantId);
    }

    @Get(':id/users')
    @Roles('ADMIN')
    @Permissions('role.read')
    @ApiOperation({ summary: 'List users of a role' })
    @ApiResponse({ status: 200, description: 'List of users' })
    listUsers(@Param('id') id: string, @Query('tenantId') tenantId: string) {
        return this.rolesService.findUsersOfRole(id, tenantId);
    }
}
