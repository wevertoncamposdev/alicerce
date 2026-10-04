// modules/develop/content/part1-fundamentos.tsx
// Conteúdo estático da documentação — Fundamentos: visão geral, multi-tenant, auth/JWT.
// Conteúdo vive em componentes puros (sem "use client") para renderizar 100% no servidor.

import {
    DocSection,
    DocSubTitle,
    DocP,
    DocCode,
    DocCallout,
    DocRouteTable,
    DocBadgeRow,
} from "@modules/develop/components/DocBlocks";

export function VisaoGeralSection() {
    return (
        <DocSection id="visao-geral" kicker="Fundamentos" title="Visão geral do Alicerce">
            <DocP>
                Alicerce é um framework full-stack pessoal extraído do projeto de referência{" "}
                <code>system_development</code>. Ele existe para que qualquer produto novo (o primeiro
                consumidor real é o SaaS <strong>Capital Humano / FAROL</strong>) comece com autenticação,
                multi-tenancy, RBAC e um padrão de CRUD já resolvidos — restando ao time apenas modelar o
                domínio.
            </DocP>
            <DocP>
                A stack é <strong>Next.js (App Router)</strong> no frontend e{" "}
                <strong>NestJS + Prisma + PostgreSQL</strong> no backend. O contrato entre as duas pontas é
                sempre o mesmo: Server Components chamam <code>apiServer</code> diretamente — não existem
                Route Handlers (<code>app/api/.../route.ts</code>) intermediando chamadas de dado. A URL é a
                fonte de verdade para estado de listagem (busca, paginação, ordenação, filtros).
            </DocP>

            <DocSubTitle>As três camadas de todo módulo</DocSubTitle>
            <DocP>Independente da entidade, o fluxo de dado atravessa sempre as mesmas três camadas:</DocP>
            <DocCode label="fluxo de uma requisição">
                {`Server Component (page.tsx)
    -> lib/registry (getModule) resolve o módulo pelo nome
    -> module.dataHandlers.search|read|create|update|delete
    -> modules/<nome>/config/provider.ts
    -> apiServer.get|post|patch|delete (lib/api-server.ts, server-only)
    -> Backend NestJS: Controller -> Service -> Prisma -> PostgreSQL`}
            </DocCode>

            <DocSubTitle>Peças centrais do frontend</DocSubTitle>
            <DocBadgeRow
                items={[
                    "DataProvider",
                    "TypeView (list/cards/graph/form)",
                    "RecordListHost",
                    "Registry (defineRecordModule)",
                    "FormView + autosave",
                    "MetaDataShell",
                    "RelationShell",
                    "DetailShellEngine",
                ]}
            />
            <DocP>
                Esses conceitos foram estudados e implementados em 8 fases (todas concluídas) e validados no
                módulo <code>favorites</code>, usado como sandbox de referência ao longo desta página — sempre
                que você vir um exemplo de código aqui, ele foi tirado (ou é equivalente) ao módulo real{" "}
                <code>frontend/src/modules/favorites</code> e <code>backend/src/modules/favorites</code>.
            </DocP>

            <DocCallout type="rule" title="Regra de ouro da fronteira Server/Client">
                Objetos <code>ColumnDef</code> (TanStack Table) contêm funções de render (<code>cell</code>) e{" "}
                <strong>não podem</strong> atravessar a fronteira Server → Client como props. Cada módulo tem
                seu próprio wrapper de lista com <code>&quot;use client&quot;</code> (ex.:{" "}
                <code>FavoritesListView.tsx</code>) que importa as colunas internamente. Nunca passe colunas
                como prop vindas de um Server Component.
            </DocCallout>
        </DocSection>
    );
}

export function MultiTenantSection() {
    return (
        <DocSection id="multi-tenant" kicker="Fundamentos" title="Multi-tenant">
            <DocP>
                Todo dado do sistema pertence a um <code>tenantId</code>. O isolamento entre tenants é a
                garantia de segurança mais importante do Alicerce — uma falha aqui é vazamento de dado entre
                clientes diferentes.
            </DocP>

            <DocSubTitle>Como o tenantId chega até o service (backend)</DocSubTitle>
            <DocCode label="core/common/decorators/tenant-id.decorator.ts">
                {`export const TenantId = createParamDecorator((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const paramTenantId = request.params['tenantId'];
  const headerTenantId = request.headers['x-tenant-id'];
  const tenantId = request.tenantId ?? request.user?.tenantId ?? headerTenantId;

  if (paramTenantId && tenantId && paramTenantId !== tenantId) {
    throw new ForbiddenException('TenantId da rota não confere com o contexto');
  }
  if (!tenantId) throw new ForbiddenException('TenantId não encontrado no contexto');
  return paramTenantId ?? tenantId;
});`}
            </DocCode>
            <DocP>
                O decorator prioriza o <code>tenantId</code> do JWT (<code>request.user.tenantId</code>), com
                fallback para o header <code>x-tenant-id</code>. Todo controller injeta o tenant com{" "}
                <code>@TenantId() tenantId: string</code> e repassa ao service — nunca confie em um{" "}
                <code>tenantId</code> vindo do body do request.
            </DocP>

            <DocCallout type="danger" title="Cuidado — vazamento silencioso">
                Toda query Prisma que lê, atualiza ou deleta um recurso do tenant precisa filtrar por{" "}
                <code>tenantId</code> no <code>where</code>. Isso vale também para relações N:N — por
                exemplo, <code>readRolePermissions</code> e <code>readRoleUsers</code> precisam sempre passar{" "}
                <code>tenantId</code> na query, não apenas o id da role. Esquecer isso não quebra o build nem
                os testes óbvios: ele silenciosamente devolve dado de outro tenant.
            </DocCallout>

            <DocSubTitle>Checklist ao escrever uma query nova</DocSubTitle>
            <DocCode label="checklist">
                {`1. O "where" filtra por tenantId? (findMany, findFirst, findUnique + guard manual)
2. Em update/delete: eu validei tenantId ANTES de mutar, não confiei no id sozinho?
3. Em relações N:N (RelationShell), a tabela de junção também tem tenantId?
4. O "include"/"select" do Prisma expõe apenas campos que o outro tenant pode ver?`}
            </DocCode>

            <DocSubTitle>Prisma include sempre com select</DocSubTitle>
            <DocP>
                Nunca use <code>include: {"{ user: true }"}</code> puro — isso serializa todos os campos do
                usuário relacionado, inclusive hash de senha e outros campos sensíveis. Use sempre{" "}
                <code>select</code> explícito, como no exemplo de <code>favorites.service.ts</code>:
            </DocP>
            <DocCode label="modules/favorites/favorites.service.ts (findOne)">
                {`const favorite = await this.prisma.favorite.findUnique({
  where: { id },
  include: {
    user: { select: { id: true, email: true } },
    tenant: { select: { id: true, legalName: true } },
  },
});
if (!favorite || favorite.tenantId !== tenantId || favorite.userId !== userSub) {
  throw new Error('Favorite not found or access denied');
}`}
            </DocCode>
        </DocSection>
    );
}

export function AuthJwtSection() {
    return (
        <DocSection id="auth-jwt" kicker="Fundamentos" title="Autenticação e JWT">
            <DocP>
                A autenticação é stateless via JWT. O <code>AuthGuard</code> é global (aplicado a todas as
                rotas do backend) e só libera acesso sem token quando o handler ou o controller está marcado
                com <code>@Public()</code>.
            </DocP>

            <DocCode label="core/auth/auth.guard.ts (resumo)">
                {`export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException();

    const payload = await this.jwtService.verifyAsync(token);
    request['user'] = payload; // { sub, tenantId, roles, ... }
    return true;
  }
}`}
            </DocCode>
            <DocP>
                O payload decodificado fica disponível em <code>request.user</code>. Dois decorators extraem
                dele o que os controllers precisam: <code>@CurrentUserId()</code> (retorna{" "}
                <code>request.user.sub</code>) e <code>@TenantId()</code> (visto na seção anterior).
            </DocP>

            <DocSubTitle>Fluxo de login</DocSubTitle>
            <DocCode label="fluxo">
                {`1. POST /auth/sign-in (rota pública, @Public())
2. auth.service valida credenciais e assina o JWT (sub, tenantId, roles, permissions)
3. Frontend guarda o token via lib/auth-login.ts -> lib/session.ts (cookie httpOnly)
4. Toda navegação subsequente: lib/auth-server.ts lê o cookie no servidor
   e expõe getCurrentUser() para Server Components / layouts`}
            </DocCode>

            <DocSubTitle>apiServer vs apiClient — quando usar cada um</DocSubTitle>
            <DocRouteTable
                rows={[
                    {
                        method: "GET",
                        path: "lib/api-server.ts",
                        guard: "server-only",
                        description:
                            "Usado por Server Components e Server Actions. Lê o cookie de sessão via next/headers automaticamente. Nunca pode ser importado em um Client Component.",
                    },
                    {
                        method: "POST",
                        path: "lib/api-client.ts",
                        guard: "client",
                        description:
                            "Usado em componentes client (formulários com autosave, ações otimistas). Não tem acesso a next/headers — o token trafega via fetch com credentials/cookies do browser.",
                    },
                ]}
            />

            <DocCallout type="warning" title="Peculiaridades do apiServer">
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        Não aceita <code>params</code> no estilo axios — monte a query manualmente com{" "}
                        <code>URLSearchParams</code>.
                    </li>
                    <li>
                        Retorna o corpo da resposta diretamente, sem wrapper <code>.data</code>.
                    </li>
                    <li>
                        Normalize base/path (<code>cleanBase</code>/<code>cleanPath</code>) para evitar bug de
                        barra dupla nas URLs montadas.
                    </li>
                </ul>
            </DocCallout>

            <DocSubTitle>Rota pública de exemplo</DocSubTitle>
            <DocCode label="core/auth/auth.controller.ts (trecho)">
                {`@Public()
@Post('sign-in')
signIn(@Body() dto: SignInDto) {
  return this.authService.signIn(dto);
}`}
            </DocCode>
        </DocSection>
    );
}
