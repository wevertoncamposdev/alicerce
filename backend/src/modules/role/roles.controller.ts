import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Search,
  UseGuards,
} from '@nestjs/common';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

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
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('role.read')
  findAll(@TenantId() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('role.read')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Post()
  @Permissions('role.create')
  create(@Body() dto: CreateRoleDto, @TenantId() tenantId: string) {
    return this.rolesService.create(dto, tenantId);
  }

  @Patch(':id')
  @Permissions('role.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('role.delete')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rolesService.remove(id, tenantId);
  }

  @Post(':id/users')
  @Permissions('role.assign')
  attachUser(
    @Param('id') id: string,
    @Body() dto: AttachRoleUserDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.attachUser(id, tenantId, dto.userId);
  }

  @Delete(':id/users/:userId')
  @Permissions('role.assign')
  detachUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.rolesService.detachUser(id, tenantId, userId, currentUserId);
  }

  @Post(':id/permissions')
  @Permissions('role.assign')
  attachPermission(
    @Param('id') id: string,
    @Body() dto: AttachRolePermissionDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.attachPermission(
      id,
      tenantId,
      dto.permissionId,
      dto.resource,
    );
  }

  @Delete(':id/permissions/:permissionId')
  @Permissions('role.assign')
  detachPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.detachPermission(id, tenantId, permissionId);
  }

  @Search()
  @Permissions('role.read')
  @ApiOperation({ summary: 'Search roles' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiBody({ schema: { type: 'object' } })
  search(@Body() query: SearchRoleDto, @TenantId() tenantId: string) {
    return this.rolesService.search(query, tenantId);
  }

  @Get(':id/permissions')
  @Permissions('role.read')
  @ApiOperation({ summary: 'List permissions of a role' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  listPermissions(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rolesService.findPermissionsOfRole(id, tenantId);
  }

  @Get(':id/users')
  @Permissions('role.read')
  @ApiOperation({ summary: 'List users of a role' })
  @ApiResponse({ status: 200, description: 'List of users' })
  listUsers(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rolesService.findUsersOfRole(id, tenantId);
  }
}
