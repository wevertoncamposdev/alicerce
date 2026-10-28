import request from 'supertest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { InMemoryMailProvider } from './in-memory-mail.provider';

let counter = 0;
// Nome/slug/e-mail únicos por chamada — os specs rodam em sequência
// (runInBand) contra o MESMO banco, sem reset entre arquivos.
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export interface Session {
  accessToken: string;
  refreshCookie: string;
  userId: string;
  tenantId: string;
  email: string;
}

// `refresh_token` só sai como Set-Cookie (nunca no JSON — ver
// AuthController#omitRefreshToken); extrai o par `nome=valor` igual a
// `frontend/src/lib/session.ts#extractSetCookieValue`, reimplementado aqui
// porque o backend não importa código do frontend.
export function extractCookiePair(
  setCookieHeaders: string | string[] | undefined,
  cookieName: string,
): string {
  const headers = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
      ? [setCookieHeaders]
      : [];

  for (const header of headers) {
    const [pair] = header.split(';');
    if (pair.startsWith(`${cookieName}=`)) return pair;
  }
  throw new Error(`Cookie "${cookieName}" não encontrado no Set-Cookie.`);
}

export async function registerTenant(
  app: NestFastifyApplication,
  overrides: Partial<{ email: string; password: string; tenantName: string }> = {},
): Promise<Session> {
  const suffix = unique('tenant');
  const email = overrides.email ?? `admin-${suffix}@example.com`;
  const password = overrides.password ?? 'SenhaForte123';

  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      tenantName: overrides.tenantName ?? `Tenant ${suffix}`,
      tenantSlug: suffix,
      email,
      password,
      acceptedTerms: true,
    })
    .expect(201);

  return {
    accessToken: res.body.access_token,
    refreshCookie: extractCookiePair(res.headers['set-cookie'], 'refresh_token'),
    userId: res.body.user.id,
    tenantId: res.body.tenant.id,
    email,
  };
}

export async function login(
  app: NestFastifyApplication,
  email: string,
  password: string,
): Promise<Session> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: res.body.access_token,
    refreshCookie: extractCookiePair(res.headers['set-cookie'], 'refresh_token'),
    userId: res.body.user.id,
    tenantId: res.body.tenant.id,
    email,
  };
}

/**
 * Convida um usuário novo (admin autenticado) e já aceita o convite com uma
 * senha fixa, lendo o token do InMemoryMailProvider (nunca do log — ver
 * etapa 12.1). Devolve a sessão (já logada) do usuário convidado.
 */
export async function inviteAndAccept(
  app: NestFastifyApplication,
  mail: InMemoryMailProvider,
  adminSession: Session,
  overrides: Partial<{ email: string; name: string; password: string }> = {},
): Promise<Session> {
  const suffix = unique('invited');
  const email = overrides.email ?? `${suffix}@example.com`;
  const password = overrides.password ?? 'SenhaForte123';

  await request(app.getHttpServer())
    .post('/api/user')
    .set('Authorization', `Bearer ${adminSession.accessToken}`)
    .send({ email, name: overrides.name ?? 'Usuário Convidado' })
    .expect(201);

  const token = mail.getLastTokenFor(email);

  await request(app.getHttpServer())
    .post('/api/auth/accept-invite')
    .send({ token, password })
    .expect(200);

  return login(app, email, password);
}

export async function refreshWith(
  app: NestFastifyApplication,
  refreshCookie: string,
): Promise<{ status: number; refreshCookie?: string; accessToken?: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/refresh')
    .set('Cookie', refreshCookie);

  if (res.status !== 200) {
    return { status: res.status };
  }

  return {
    status: res.status,
    accessToken: res.body.access_token,
    refreshCookie: extractCookiePair(res.headers['set-cookie'], 'refresh_token'),
  };
}
