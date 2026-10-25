import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

/**
 * "Módulo de Plataforma" (ADR 0012) — cross-tenant por natureza, lê via
 * PrismaBootstrapService (role owner, ignora RLS). As tabelas agregadas
 * aqui (User, Feedback) têm RLS; sem bypassar, uma consulta sem tenant no
 * contexto veria 0 linhas em todo tenant, não os dados reais.
 */
@Injectable()
export class ManagementService {
  private readonly logger = new Logger(ManagementService.name);

  constructor(private readonly prismaBootstrap: PrismaBootstrapService) {}

  async listTenants() {
    const tenants = await this.prismaBootstrap.tenant.findMany({
      select: {
        id: true,
        legalName: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { users: true, feedbacks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map(({ _count, ...tenant }) => ({
      ...tenant,
      userCount: _count.users,
      feedbackCount: _count.feedbacks,
    }));
  }

  // Auditoria formal (gravada em `Audit`) fica fora desta rodada — ver
  // decisão 4 do ADR 0012 (Audit.userId é obrigatório e FK pra `User`, um
  // platform user não é um `User`). Log estruturado é a trilha disponível
  // hoje; revisitar quando "impersonação auditada" (pós-mínimo) entrar.
  async updateTenantStatus(
    tenantId: string,
    dto: UpdateTenantStatusDto,
    actorEmail: string,
  ) {
    const tenant = await this.prismaBootstrap.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const updated = await this.prismaBootstrap.tenant.update({
      where: { id: tenantId },
      data: { status: dto.status },
      select: { id: true, legalName: true, slug: true, status: true },
    });

    this.logger.warn(
      `[management] ${actorEmail} alterou o status do tenant ${updated.slug} (${updated.id}) para ${updated.status}`,
    );

    return updated;
  }
}
