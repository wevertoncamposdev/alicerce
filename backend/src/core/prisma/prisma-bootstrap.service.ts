import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@core/prisma/generated/client';

/**
 * Cliente usado exclusivamente pelo AuthService. Conecta como a role owner
 * (DATABASE_URL, a mesma das migrations/seed) — por isso ignora RLS.
 *
 * AuthService é a única parte do sistema cujo trabalho é descobrir QUEM é o
 * usuário/tenant antes de qualquer tenantId existir no contexto: login por
 * email, refresh token por hash, criação do tenant no signup. Nenhuma dessas
 * consultas pode ser tenant-scoped porque o tenant ainda não é conhecido —
 * não é um bypass geral, é o "portão de entrada" que estabelece o contexto
 * que todo o resto do sistema (via PrismaService) passa a exigir.
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
