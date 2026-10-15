import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cliente ioredis compartilhado. `lazyConnect: true` + `onModuleInit`
 * conectando explicitamente evita abrir a conexão antes do Nest terminar de
 * montar o grafo de módulos (mesmo padrão de lifecycle do PrismaService).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL não definida');
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      // Depois de ~10 tentativas, para de reconectar em vez de tentar pra
      // sempre — cache é best-effort: se o Redis ficou mesmo fora do ar, é
      // melhor cair pro Postgres de vez (rápido, sem erro) do que acumular
      // timers de retry indefinidamente.
      retryStrategy: (times) =>
        times > 10 ? null : Math.min(times * 200, 5000),
    });
    // Cache é best-effort (ver PermissionCacheService) — um Redis fora do ar
    // não deve derrubar a aplicação, só degradar para consultar o Postgres
    // a cada checagem de permissão.
    this.client.on('error', (error) => {
      this.logger.warn(`Erro de conexão com Redis: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect().catch((error: Error) => {
      this.logger.warn(`Não foi possível conectar ao Redis: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
