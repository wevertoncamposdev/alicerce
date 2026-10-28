import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@lib/session";
import { PLATFORM_SESSION_COOKIE } from "@lib/platform-session";

// Etapa 12.2 — `proxy.ts` nunca executava em produção (estava na raiz do
// projeto; o Next só reconhece o arquivo dentro de `src/` quando `app/`
// também está em `src/app/` — corrigido nesta etapa movendo o arquivo
// pra aqui). Com o proxy executando de verdade por 1ª vez, ficou exposto
// que faltavam aqui as rotas do grupo `(public)` além de login/registro
// — qualquer usuário sem sessão abrindo `/termos`, aceitando convite,
// resetando senha etc. caía num redirect pro login. Lista completa de
// `src/app/(public)/**/page.tsx`.
const PUBLIC_ROUTES = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/accept-invite",
    "/auth/confirm-email-change",
    "/termos",
];
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

// Usuário de plataforma (ADR 0012) tem sessão própria, sem relação com a de
// tenant acima — path separado, cookie separado, redirect separado.
const PLATFORM_LOGIN_ROUTE = "/platform/login";

// Etapa 10.3 — o SDK do Sentry no browser manda eventos pro host do DSN
// configurado; sem isso no connect-src, a CSP bloquearia o próprio reporte
// de erro. Migrou de next.config.ts pra aqui na etapa 12.2 (quem monta a
// CSP agora é o proxy, não mais o next.config.ts).
function sentryIngestHost(): string | null {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return null;
    try {
        return new URL(dsn).host;
    } catch {
        return null;
    }
}

/**
 * Etapa 12.2 (ADR 0013, corrige C1): nonce por requisição + `script-src
 * 'nonce-<n>' 'strict-dynamic'` — sem isso o Next injeta um script inline
 * pra hidratar a página e o Chrome bloqueia por CSP (nenhuma página
 * hidratava em produção). Nonce por requisição só funciona com
 * renderização dinâmica (ver `app/layout.tsx`, `export const dynamic =
 * "force-dynamic"`) — é por isso que as páginas públicas estáticas
 * (login, registro, termos...) perderam a pré-renderização.
 *
 * Mesmos directives de antes (ver next.config.ts antes desta etapa) —
 * só `script-src` ganha nonce/strict-dynamic. `style-src` continua com
 * `'unsafe-inline'`: componentes como chart.tsx injetam `<style>` via
 * `dangerouslySetInnerHTML`, que o Next não consegue nonce'ar
 * automaticamente (só o que ele mesmo injeta).
 */
function buildCsp(nonce: string): string {
    const isDev = process.env.NODE_ENV === "development";
    const ingestHost = sentryIngestHost();
    const connectSrc = ["'self'", ingestHost].filter(Boolean).join(" ");
    const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`;

    return [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src ${connectSrc}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ");
}

/**
 * `src/proxy.ts` (mesmo nível de `src/app/` — ver nota da etapa 12.2 em
 * `PUBLIC_ROUTES` acima) roda ANTES de qualquer página ser renderizada —
 * antes até de decidir se é Server ou Client Component. Ele intercepta a
 * requisição no nível de rede.
 *
 * Isso substitui o que hoje o MainLayout faz com useEffect + router.replace:
 *
 *   useEffect(() => {
 *     if (!loading && !isAuthenticated) router.replace("/auth/login");
 *   }, [...]);
 *
 * O problema daquele padrão: o componente PRECISA renderizar primeiro
 * (nem que seja um "Verificando sessao..."), só depois de montar é que o
 * useEffect roda e manda pro login. Ou seja, sempre existe um flash de
 * conteúdo/carregamento antes do redirect.
 *
 * Com middleware, o redirect acontece antes de qualquer HTML ser gerado.
 * Mais rápido e sem flash, porque a decisão é feita "na borda", antes da
 * renderização.
 *
 * IMPORTANTE: a partir do Next 16 o proxy roda no runtime Node.js, não no
 * Edge Runtime (ver changelog de `proxy.js`) — mas a checagem aqui
 * continua só olhando se o cookie existe, sem validar a assinatura do
 * JWT. Validação "de verdade" continua acontecendo no Nest, a cada
 * chamada via proxy BFF. O proxy é só a primeira barreira, pra UX — não é
 * o único guarda de segurança.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = buildCsp(nonce);

    function next() {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-nonce", nonce);
        requestHeaders.set("Content-Security-Policy", csp);

        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set("Content-Security-Policy", csp);
        return response;
    }

    // Pasta platform/ (ADR 0012): sessão própria, nunca a de tenant acima.
    if (pathname.startsWith("/platform")) {
        const hasPlatformSession = request.cookies.has(PLATFORM_SESSION_COOKIE);
        const isPlatformLoginRoute = pathname === PLATFORM_LOGIN_ROUTE;

        if (hasPlatformSession && isPlatformLoginRoute) {
            return NextResponse.redirect(new URL("/platform/tenants", request.url));
        }

        if (!hasPlatformSession && !isPlatformLoginRoute) {
            return NextResponse.redirect(new URL(PLATFORM_LOGIN_ROUTE, request.url));
        }

        return next();
    }

    const hasSession = request.cookies.has(SESSION_COOKIE);

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    // Sessão válida tentando acessar login/register -> manda pra dentro
    if (hasSession && isAuthRoute) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Sem sessão e rota não é pública -> manda pro login
    if (!hasSession && !isPublicRoute) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    return next();
}

// Roda em tudo, exceto assets estáticos, a própria API (senão criaria loop
// nas Route Handlers de login, que precisam ser acessíveis sem sessão) e
// prefetches do next/link (não renderizam página — recomendação do guia
// de CSP do próprio Next).
export const config = {
    matcher: [
        {
            // D9 (docs/PLAN-fundacao-ux.md): antes só excluía `favicon.ico`
            // nomeado — qualquer outro ícone/manifest (icon.png,
            // site.webmanifest, favicon-16x16.png...) ainda caía na
            // verificação de sessão e redirecionava pro login deslogado.
            // Regra genérica: qualquer caminho com extensão de arquivo.
            source: "/((?!api|_next/static|_next/image|.*\\..*$).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
