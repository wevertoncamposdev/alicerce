import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.80.1", "localhost", "127.0.0.1"],
  experimental: {
    // Desliga o nudge automático de upgrade do `next build` (default
    // "security" no 16.4): ele mata o processo filho do build e descarta a
    // saída antes de terminar, deixando o .next sem BUILD_ID. Upgrade de
    // dependência aqui é só via /upgrade-deps, nunca automático.
    agentUpgrade: false,
  },
  // Bundle mínimo autocontido em .next/standalone — usado pelo Dockerfile
  // para não precisar copiar node_modules inteiro na imagem final.
  output: "standalone",
};

// Etapa 10.2 — captura de erro já é feita por instrumentation.ts /
// instrumentation-client.ts (ativados só com SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN).
// `@sentry/nextjs@11` não expõe mais um `withSentryConfig` na raiz do pacote
// pra plugar neste arquivo — upload de source maps fica pra quando/se isso
// for necessário, não é exigido pra erros chegarem no painel.

// Etapa 10.3 — o SDK do Sentry no browser manda eventos pro host do DSN
// configurado; sem isso no connect-src, a CSP bloquearia o próprio reporte
// de erro que a 10.2 acabou de ligar.
function sentryIngestHost(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    return new URL(dsn).host;
  } catch {
    return null;
  }
}

// Server-side first (AGENTS §4.1): o browser nunca fala direto com o
// backend (INTERNAL_API_URL é server-only), só com a própria origem — por
// isso connect-src não precisa citar o host do Nest.
function buildCsp(): string {
  const ingestHost = sentryIngestHost();
  const connectSrc = ["'self'", ingestHost].filter(Boolean).join(' ');

  // Turbopack em dev injeta HMR com eval; produção não precisa disso.
  const scriptSrc =
    process.env.NODE_ENV === 'development' ? "'self' 'unsafe-eval'" : "'self'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind/shadcn vão pra um CSS externo, mas alguns componentes (ex.:
    // chart.tsx) injetam <style> inline via dangerouslySetInnerHTML — risco
    // bem menor que script inline, aceitável aqui.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

async function headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: buildCsp() },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ];
}

const nextConfigWithHeaders: NextConfig = { ...nextConfig, headers };

export default nextConfigWithHeaders;