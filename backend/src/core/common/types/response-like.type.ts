/**
 * AllExceptionsFilter precisa funcionar com o response real de 3 runtimes
 * (Fastify em produção, Express no `createNestApplication()` sem adapter
 * explícito, Node puro em testes) — por isso os métodos são todos
 * opcionais e a escolha de qual chamar é feita em runtime via
 * `typeof x === 'function'`, não por este tipo.
 */
export interface ResponseLike {
  statusCode?: number;
  status?: (code: number) => ResponseLike;
  json?: (body: unknown) => unknown;
  code?: (code: number) => ResponseLike;
  send?: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
  end?: (body?: string) => unknown;
}
