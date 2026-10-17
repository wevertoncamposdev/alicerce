import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@core/prisma/generated/client';
import { tenantRlsExtension } from '@core/prisma/extensions/tenant-rls.extension';

/**
 * Cliente usado por todo o resto da aplicação (exceto AuthService — ver
 * PrismaBootstrapService) — conecta como a role `app_runtime`, que NÃO é
 * owner das tabelas e por isso respeita as políticas de RLS criadas na
 * migration add_tenant_rls (owner ignora RLS por padrão no Postgres).
 *
 * `Object.assign(this, this.$extends(...))` troca os delegates de modelo
 * (`this.task`, `this.user`, etc., propriedades próprias da instância) pelos
 * extendidos, mas preserva os métodos de protótipo (`$connect`,
 * `$disconnect`, `onModuleInit`) — é o jeito de ter RLS transparente em
 * todos os ~20 services que injetam PrismaService sem mudar nenhum deles,
 * já que `$extends()` sozinho retornaria um objeto novo, não esta instância.
 *
 * `rawClient` é uma SEGUNDA conexão, nunca estendida, usada só internamente
 * pela extension para abrir a transação que seta `app.tenant_id` (ver
 * tenant-rls.extension.ts para o porquê: `Object.assign` também contamina o
 * estado interno de extensões do client, então até uma transação aberta a
 * partir de `this` acabaria recursando no mesmo hook).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly rawClient: PrismaClient;

  constructor() {
    const connectionString = process.env.APP_DATABASE_URL;
    if (!connectionString) {
      throw new Error('APP_DATABASE_URL não definida');
    }

    super({ adapter: new PrismaPg({ connectionString }) });

    const rawClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    Object.assign(this, tenantRlsExtension(this, rawClient));
    this.rawClient = rawClient;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.rawClient.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.rawClient.$disconnect();
  }
}
