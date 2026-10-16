// Extraído de audit.interceptor.ts para ser reaproveitado pelo
// AllExceptionsFilter (auditoria de 403 — ver PLAN.md, Etapa 2/P7.2).
//
// Extrai o nome do recurso da URL, ignorando prefixo /api e, quando
// existir, o segmento tenant/:tenantId/.
// "/api/examples/019f..."        -> "examples"
// "/api/tenant/abc/audit"         -> "audit"
// "/api/tenant/abc/examples/xy"  -> "examples"
//
// O frontend consulta a trilha de auditoria pelo nome singular do módulo
// (normalizeAuditEntityName em frontend/src/screens/DetailViewScreen.tsx).
// Como as rotas usam o nome do recurso ora no plural ("examples",
// "roles"), ora já singular ("user", "tenant"), normalizamos aqui também
// para que o nome gravado sempre bata com o nome consultado — e é esse
// mesmo nome singular que serve de chave do Prisma Client em quem usa isto
// (coincide com o nome do delegate: `this.prisma.user`, `.role`, etc.).
export function resolveAuditEntityFromUrl(url: string): string {
  const resourceMatch = url.match(/^\/api\/(?:tenant\/[^/]+\/)?([^/?]+)/);
  const resource = resourceMatch?.[1] ?? url;
  return resource.endsWith('s') ? resource.slice(0, -1) : resource;
}
