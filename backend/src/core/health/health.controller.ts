import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@core/auth/auth.guard';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisService } from '@core/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Bloqueante: sem Postgres a aplicação inteira não funciona (toda
      // rota autenticada depende dele) — `down` aqui derruba o /health.
      () => this.prismaIndicator.pingCheck('postgres', this.prisma),
      // Non-blocking: mesmo fail-open já estabelecido no
      // PermissionCacheService (Redis fora do ar degrada pra consulta
      // direta no Postgres, não derruba a app) — `degraded`, não `down`,
      // mantém o /health em 200 mesmo com Redis fora do ar.
      () => this.checkRedis(),
    ]);
  }

  private async checkRedis() {
    const indicator = this.healthIndicatorService.check('redis');

    try {
      await this.redis.client.ping();
      return indicator.up();
    } catch (error) {
      return indicator.degraded({
        message: (error as Error).message,
        note: 'fail-open — não bloqueia a aplicação',
      });
    }
  }
}
