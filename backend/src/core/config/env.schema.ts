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

  // Storage (Fase 6, ADR 0010) — driver local tem defaults utilizáveis em
  // dev; variáveis de S3 ficam opcionais aqui e são exigidas em runtime só
  // quando STORAGE_DRIVER=s3 (mesmo padrão de falha de RedisService: lança
  // no momento de uso, não no boot, pra não quebrar quem nunca usa S3).
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./storage'),
  STORAGE_LOCAL_PUBLIC_URL: z.string().default('http://localhost:5000'),
  UPLOAD_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Mail (Fase 7, ADR 0011) — driver console (default) não exige nada;
  // variáveis de SMTP/Resend ficam opcionais aqui, exigidas em runtime só
  // quando MAIL_DRIVER usa o adapter correspondente (mesmo padrão do
  // Storage: falha no momento de uso, não no boot).
  MAIL_DRIVER: z.enum(['console', 'smtp', 'resend']).default('console'),
  MAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // Base pros links nos e-mails (convite, reset de senha, verificação...).
  FRONTEND_URL: z.string().default('http://localhost:3000'),
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
