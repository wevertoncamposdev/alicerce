import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register"];
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

/**
 * middleware.ts na RAIZ do projeto (não dentro de app/) roda ANTES de
 * qualquer página ser renderizada — antes até de decidir se é Server ou
 * Client Component. Ele intercepta a requisição no nível de rede.
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
 * IMPORTANTE: middleware roda no Edge Runtime, um ambiente reduzido (nem
 * tudo do Node está disponível ali). Por isso aqui a gente só CHECA se o
 * cookie existe — não valida a assinatura do JWT nem busca o perfil
 * completo. Validação "de verdade" (o token é válido? ainda não expirou?)
 * continua acontecendo no Nest, a cada chamada via proxy. O middleware é
 * só a primeira barreira, pra UX — não é o único guarda de segurança.
 */
export function proxy(request: NextRequest) {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    const { pathname } = request.nextUrl;

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

    return NextResponse.next();
}

// Roda em tudo, exceto assets estáticos e a própria API (senão criaria loop
// nas Route Handlers de login, que precisam ser acessíveis sem sessão).
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};