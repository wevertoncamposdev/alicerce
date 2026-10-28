// modules/tenant/tenant.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
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
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(RolesPermissionsGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // `tenant.create` nunca entra no catálogo nem é concedida a nenhum papel
  // (ver ADR 0006/Plano Base.md 1.4) — onboarding é só via `POST /auth/register`.
  // Rota reservada para o futuro `management` (Fase 11), que terá seu
  // próprio contexto de autenticação fora do RBAC por tenant.
  @Post()
  @Permissions('tenant.create')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  // Precisa vir ANTES de `:id` — senão o Nest casa "current" como valor de
  // `:id` (rotas são testadas na ordem em que são declaradas).
  @Get('current')
  @Permissions('tenant.read')
  getCurrent(@TenantId() tenantId: string) {
    return this.tenantService.findOne(tenantId, tenantId);
  }

  @Patch('current')
  @Permissions('tenant.update')
  updateCurrent(
    @Body() dto: UpdateTenantDto,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.tenantService.update(tenantId, dto, tenantId, userId);
  }

  @Get(':id')
  @Permissions('tenant.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.tenantService.findOne(id, tenantId);
  }

  @Get(':id/users')
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'List users of a tenant' })
  @ApiResponse({ status: 200, description: 'Users of the tenant.' })
  listUsers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.tenantService.findUsersOfTenant(id, tenantId);
  }

  @Get(':id/roles')
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'List roles of a tenant' })
  @ApiResponse({ status: 200, description: 'Roles of the tenant.' })
  listRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.tenantService.findRolesOfTenant(id, tenantId);
  }

  @Patch(':id')
  @Permissions('tenant.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantDto,
    @TenantId() tenantId: string,
  ) {
    return this.tenantService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('tenant.manage')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
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
