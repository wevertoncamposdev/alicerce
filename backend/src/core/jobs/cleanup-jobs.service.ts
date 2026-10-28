import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Manutenção cross-tenant agendada (etapa 10.1, resolve também a 9.4 —
 * retenção de auditoria). Usa `PrismaBootstrapService` porque nenhum destes
 * jobs tem um tenant de request pra escopar via RLS (ver comentário da
 * classe). Sem lock distribuído: Redis não tem esse helper hoje e nenhuma
 * etapa pede — só importa se um dia houver deploy multi-instância.
 */
@Injectable()
export class CleanupJobsService {
  private readonly logger = new Logger(CleanupJobsService.name);

  constructor(
    private readonly prismaBootstrap: PrismaBootstrapService,
    private readonly configService: ConfigService,
  ) {}

  // Refresh tokens expirados não têm valor histórico vivo, mas mantemos a
  // linha (só marcamos revogado) — é a mesma trilha que MeService.listSessions
  // já le/oculta por `expiresAt`/`revokedAt`.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRefreshTokens(): Promise<number> {
    const { count } = await this.prismaBootstrap.refreshToken.updateMany({
      where: { revokedAt: null, expiresAt: { lt: new Date() } },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`${count} refresh token(s) expirado(s) revogado(s)`);
    return count;
  }

  // AccountToken expirado (convite, reset de senha...) não tem nenhum valor
  // depois de vencer — este apaga de verdade.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredAccountTokens(): Promise<number> {
    const { count } = await this.prismaBootstrap.accountToken.deleteMany({
      where: { usedAt: null, expiresAt: { lt: new Date() } },
    });

    this.logger.log(`${count} account token(s) expirado(s) removido(s)`);
    return count;
  }

  // Etapa 9.4 — prazo configurável via AUDIT_RETENTION_DAYS.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldAuditEntries(): Promise<number> {
    const retentionDays = this.configService.get<number>(
      'AUDIT_RETENTION_DAYS',
      365,
    );
    const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

    const { count } = await this.prismaBootstrap.audit.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(
      `${count} registro(s) de auditoria mais antigo(s) que ${retentionDays} dias expurgado(s)`,
    );
    return count;
  }
}
