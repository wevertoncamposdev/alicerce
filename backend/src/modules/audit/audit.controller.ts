import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { UseGuards } from '@nestjs/common';
import { Roles } from '@core/common/decorators/roles.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';

// TenantScopeGuard não precisa mais ser listado aqui: é global desde o P7
// (ver AuthModule) — roda em toda rota autenticada, não só nesta.
@Controller('tenant/:tenantId/audit')
@UseGuards(RolesPermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN')
  @Permissions('audit.read')
  async findAll(
    @TenantId() tenantId: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditService.findAll(tenantId, { entity, entityId });
  }
}
