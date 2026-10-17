import { z } from 'zod';

/**
 * Validado uma vez no boot (`ConfigModule.forRoot({ validate })`, ver
 * `app.module.ts`) — falha o boot com um erro claro se faltar algo, em vez
 * de deixar o app subir e quebrar na primeira requisição que precisar da
 * variável ausente (ex.: `RedisService` hoje lança só quando alguém tenta
 * usar o Redis; `JWT_SECRET` ausente só quebraria no primeiro login).
 *
 * Não substitui os `process.env.X` espalhados pelo resto do app (main.ts,
 * services) — só garante que, se o processo chegou a aceitar conexões, essas
 * variáveis existem e têm o formato esperado.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  APP_DATABASE_URL: z.string().min(1, 'APP_DATABASE_URL é obrigatória'),
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatória'),
  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET é obrigatória'),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS é obrigatória'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Configuração de ambiente inválida — ${issues}`);
  }

  return result.data;
}
