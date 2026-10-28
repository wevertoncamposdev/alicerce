import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
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
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
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
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('role.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.remove(id, tenantId);
  }

  @Post(':id/users')
  @Permissions('role.assign')
  attachUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AttachRoleUserDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.attachUser(id, tenantId, dto.userId);
  }

  @Delete(':id/users/:userId')
  @Permissions('role.assign')
  detachUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.rolesService.detachUser(id, tenantId, userId, currentUserId);
  }

  @Search()
  @Permissions('role.read')
  @ApiOperation({ summary: 'Search roles' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiBody({ schema: { type: 'object' } })
  search(@Body() query: SearchRoleDto, @TenantId() tenantId: string) {
    return this.rolesService.search(query, tenantId);
  }

  @Get(':id/permission-matrix')
  @Permissions('role.read')
  @ApiOperation({ summary: 'Permission matrix (resource x action) of a role' })
  @ApiResponse({ status: 200, description: 'Permission matrix' })
  getPermissionMatrix(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.getPermissionMatrix(id, tenantId);
  }

  @Put(':id/permissions')
  @Permissions('role.assign')
  @ApiOperation({ summary: 'Replace the full permission set of a role' })
  @ApiResponse({ status: 200, description: 'Updated permission matrix' })
  replacePermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.replacePermissions(
      id,
      tenantId,
      dto.permissionIds,
    );
  }

  @Get(':id/permissions')
  @Permissions('role.read')
  @ApiOperation({ summary: 'List permissions of a role' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  listPermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.findPermissionsOfRole(id, tenantId);
  }

  @Get(':id/users')
  @Permissions('role.read')
  @ApiOperation({ summary: 'List users of a role' })
  @ApiResponse({ status: 200, description: 'List of users' })
  listUsers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.rolesService.findUsersOfRole(id, tenantId);
  }
}
