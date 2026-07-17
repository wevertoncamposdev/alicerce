import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { UseGuards } from '@nestjs/common';
import { TenantScopeGuard } from '@core/common/guards/tenant-scope.guard';

@Controller('tenant/:tenantId/audit')
@UseGuards(TenantScopeGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditService.findAll(tenantId, { entity, entityId });
  }
}
