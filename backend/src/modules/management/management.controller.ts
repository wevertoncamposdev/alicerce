import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/auth/auth.guard';
import { PlatformAuthGuard } from '@core/platform-auth/platform-auth.guard';
import { CurrentPlatformUser } from '@core/platform-auth/current-platform-user.decorator';
import type { PlatformJwtPayload } from '@core/platform-auth/platform-jwt-payload';
import { ManagementService } from './management.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { SearchFeedbacksQueryDto } from './dto/search-feedbacks-query.dto';

/**
 * "Módulo de Plataforma" (ADR 0012): @Public() pula AuthGuard/TenantScopeGuard
 * globais (pensados pra usuário-de-tenant); PlatformAuthGuard é o único
 * portão, igual a core/platform-auth. Sem @Permissions — acesso é binário,
 * todo platform user autenticado pode tudo aqui (ver decisão 2 do ADR).
 */
@ApiTags('management')
@ApiBearerAuth()
@Controller('management')
@Public()
@UseGuards(PlatformAuthGuard)
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('tenants')
  listTenants() {
    return this.managementService.listTenants();
  }

  @Patch('tenants/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentPlatformUser() platformUser: PlatformJwtPayload,
  ) {
    return this.managementService.updateTenantStatus(
      id,
      dto,
      platformUser.username,
    );
  }

  // Caixa única de feedbacks (decisão 3 do ADR 0012) — leitura cross-tenant,
  // sem equivalente em `modules/feedbacks` (aquele é tenant-scoped).
  @Get('feedbacks')
  listFeedbacks(@Query() query: SearchFeedbacksQueryDto) {
    return this.managementService.listFeedbacks(query);
  }
}
