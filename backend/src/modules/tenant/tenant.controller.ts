// modules/tenant/tenant.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Search,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SearchTenantsDto } from './dto/search-tenant.dto';
import { Public } from '@core/auth/auth.guard';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(RolesPermissionsGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get(':id')
  @Permissions('tenant.read')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tenantService.findOne(id, tenantId);
  }

  @Get(':id/users')
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'List users of a tenant' })
  @ApiResponse({ status: 200, description: 'Users of the tenant.' })
  listUsers(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tenantService.findUsersOfTenant(id, tenantId);
  }

  @Get(':id/roles')
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'List roles of a tenant' })
  @ApiResponse({ status: 200, description: 'Roles of the tenant.' })
  listRoles(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tenantService.findRolesOfTenant(id, tenantId);
  }

  @Patch(':id')
  @Permissions('tenant.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @TenantId() tenantId: string,
  ) {
    return this.tenantService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('tenant.manage')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Search()
  @Permissions('tenant.manage')
  @ApiOperation({ summary: 'Buscar tenants' })
  @ApiResponse({ status: 200, description: 'Tenants encontrados com sucesso.' })
  search(@Body() query: SearchTenantsDto) {
    return this.tenantService.search(query);
  }
}
