/**
 * Payload decodificado do JWT de acesso (ver AuthService.signToken) —
 * usado em toda a cadeia de guards/interceptors/filters que precisa ler
 * `request.user` sem reintroduzir `any` em cada arquivo.
 */
export interface JwtPayload {
  sub: string;
  username: string;
  tenantId: string;
  permissions: string[];
  // Nenhum signToken emite isto hoje (só `sub`) — mantido só como fallback
  // defensivo já existente em AllExceptionsFilter antes desta tipagem.
  id?: string;
}

/**
 * Logger child do Pino que o Fastify nativo vincula a `request.log` (ver
 * main.ts) — só os métodos que o projeto efetivamente usa.
 */
export interface PinoLikeLogger {
  info: (obj: unknown) => void;
  warn: (obj: unknown) => void;
  error: (obj: unknown) => void;
}

/**
 * Forma mínima de request usada por guards/interceptors/filters/decorators
 * globais — não é o tipo exato do Fastify/Express (que já existe via
 * `fastify`/`@types/express`), é só o subconjunto de campos que este
 * código cross-cutting lê, para eliminar o `any` implícito de
 * `ctx.switchToHttp().getRequest()`.
 */
export interface RequestWithAuth {
  method: string;
  url: string;
  originalUrl?: string;
  id?: string;
  ip?: string;
  params?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
  tenantId?: string;
  log?: PinoLikeLogger;
}
