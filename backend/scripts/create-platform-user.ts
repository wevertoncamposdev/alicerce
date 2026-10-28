// Fase 11 (ADR 0012) — único jeito de criar um PlatformUser: não há
// self-signup (ver decisão 1 do ADR). Reaproveita o ScriptsModule (ver
// scripts.module.ts) via NestFactory.createApplicationContext, mesmo padrão
// de sync-permission-catalog.ts, para usar o PrismaService já configurado
// em vez de abrir uma segunda conexão solta.
//
// Uso: npm run create:platform-user -- <email> <nome> <senha>
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { ScriptsModule } from './scripts.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

async function run() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error('Uso: npm run create:platform-user -- <email> <nome> <senha>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(ScriptsModule, {
    logger: false,
  });

  try {
    const prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash(password, 10);

    const platformUser = await prisma.platformUser.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    });

    console.log(`PlatformUser criado: ${platformUser.email} (${platformUser.id})`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('create-platform-user failed', err);
  process.exit(1);
});
