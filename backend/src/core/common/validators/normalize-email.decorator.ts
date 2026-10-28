import { Transform } from 'class-transformer';

// I3 (docs/PLAN-fase-12.md), etapa F2.2: sem isto, `Fulano@x.com` e
// `fulano@x.com` eram contas diferentes pro Postgres — cadastro duplicado
// com outra caixa não era bloqueado, e login com outra caixa falhava. O
// `ValidationPipe` já roda com `transform: true` (configure-app.ts), então
// o `@Transform` abaixo roda antes de `@IsEmail()` validar o valor final.
// Passa adiante valores não-string (undefined num campo opcional, ou algo
// que `@IsEmail()` vai rejeitar de qualquer forma) sem tentar normalizar.
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
