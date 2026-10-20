import { Module } from '@nestjs/common';
import { AccountTokenService } from './account-token.service';

// Não é @Global() — mesmo padrão do FileModule (Fase 6): quem precisa
// importa explicitamente. Próprio módulo (em vez de só um provider dentro
// de AuthModule) porque UsersModule também precisa dele (etapa 7.4) e
// AuthModule já importa UsersModule — importar AuthModule de volta criaria
// um ciclo.
@Module({
  providers: [AccountTokenService],
  exports: [AccountTokenService],
})
export class AccountTokenModule {}
