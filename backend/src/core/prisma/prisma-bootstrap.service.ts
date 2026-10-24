import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@core/prisma/generated/client';

/**
 * Cliente usado pelo AuthService e pelos jobs agendados de manutenção
 * (core/jobs, etapa 10.1). Conecta como a role owner (DATABASE_URL, a mesma
 * das migrations/seed) — por isso ignora RLS.
 *
 * AuthService é a parte do sistema cujo trabalho é descobrir QUEM é o
 * usuário/tenant antes de qualquer tenantId existir no contexto: login por
 * email, refresh token por hash, criação do tenant no signup. Nenhuma dessas
 * consultas pode ser tenant-scoped porque o tenant ainda não é conhecido.
 *
 * Os jobs de limpeza (expirar refresh/account tokens, expurgar auditoria
 * antiga) são o mesmo caso por um motivo diferente: rodam fora de qualquer
 * request, sem tenant algum no contexto, e precisam alcançar todos os
 * tenants de uma vez — não dá pra fazer isso com `PrismaService` (RLS
 * exige um `tenantId` setado por request).
 *
 * Em nenhum dos dois casos isto é um bypass geral: é o cliente reservado
 * pras poucas operações que, por natureza, não têm (ou ainda não têm) um
 * tenant de request pra escopar.
 */
@Injectable()
export class PrismaBootstrapService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida');
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
