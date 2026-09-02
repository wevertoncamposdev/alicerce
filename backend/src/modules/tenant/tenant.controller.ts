// modules/tenant/tenant.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Search } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SearchTenantsDto } from './dto/search-tenant.dto';
import { Public } from '@core/auth/auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  @Public()
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users of a tenant' })
  @ApiResponse({ status: 200, description: 'Users of the tenant.' })
  listUsers(@Param('id') id: string) {
    return this.tenantService.findUsersOfTenant(id);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'List roles of a tenant' })
  @ApiResponse({ status: 200, description: 'Roles of the tenant.' })
  listRoles(@Param('id') id: string) {
    return this.tenantService.findRolesOfTenant(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Search()
  @ApiOperation({ summary: 'Buscar tenants' })
  @ApiResponse({ status: 200, description: 'Tenants encontrados com sucesso.' })
  search(@Body() query: SearchTenantsDto) {
    return this.tenantService.search(query);
  }
}