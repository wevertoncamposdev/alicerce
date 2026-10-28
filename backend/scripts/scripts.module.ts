import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/core/config/env.schema';
import { PrismaModule } from '../src/core/prisma/prisma.module';
import { RedisModule } from '../src/core/redis/redis.module';
import { AuthorizationModule } from '../src/core/authorization/authorization.module';

// Contexto mínimo para scripts CLI (create-platform-user, sync-permission-
// catalog): só o que eles realmente usam (Prisma + cache/sync de
// permissões), nunca o `AppModule` inteiro. Rodar o `AppModule` completo via
// `tsx -r tsconfig-paths/register` falha ao resolver `FilesService` —
// esbuild (motor do tsx) não emite `design:paramtypes` completo quando um
// construtor mistura parâmetro com `@Inject(token)` e parâmetro de tipo
// implícito (`FilesService(prisma, @Inject(STORAGE_PROVIDER) storage)`);
// `nest start`/`nest build` (tsc) não têm essa limitação. Evitar o módulo
// problemático é mais simples e mais seguro do que mudar `FilesService`.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    AuthorizationModule,
  ],
})
export class ScriptsModule {}
