import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Search,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

import { SearchUsersDto } from './dto/search-users.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

import { UsersService } from './user.service';
import { RolesService } from '../role/roles.service';

@ApiTags('users')
@Controller('user')
@UseGuards(RolesPermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  @Roles('ADMIN')
  @Permissions('user.create')
  async create(
    @Body() createUserDto: CreateUserDto,
    @TenantId() tenantId: string,
  ): Promise<UserResponseDto> {
    const data = await this.usersService.create(createUserDto, tenantId);
    return data;
  }

  @Get()
  @Roles('ADMIN', 'USER')
  @Permissions('user.read')
  findAll(@TenantId() tenantId: string): Promise<UserResponseDto[]> {
    return this.usersService.findAllWithValidation(tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('user.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permissions('user.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @TenantId() tenantId: string,
  ) {
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('user.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.usersService.remove(id, tenantId);
  }

  @Search()
  @Roles('ADMIN', 'USER')
  @Permissions('user.read')
  search(@Body() query: SearchUsersDto, @TenantId() tenantId: string) {
    return this.usersService.search(query, tenantId);
  }

  @Get(':id/roles')
  @Roles('ADMIN')
  @Permissions('user.read')
  @ApiOperation({ summary: 'List roles of a user' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  listRoles(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rolesService.findRolesOfUser(id, tenantId);
  }

  @Get(':id/permissions')
  @Roles('ADMIN', 'USER')
  @Permissions('user.read')
  @ApiOperation({ summary: 'List effective permissions of a user' })
  @ApiResponse({
    status: 200,
    description: 'List of effective permissions inherited from the user roles',
  })
  listPermissions(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.findPermissionsOfUser(id, tenantId);
  }
}
