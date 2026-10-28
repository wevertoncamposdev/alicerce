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
    // D7 (docs/PLAN-fundacao-ux.md): default do Next é 1 MB — o backend
    // aceita até 5 MB (`UPLOAD_MAX_SIZE_BYTES`, backend/.env.example).
    // Fixo (não lido de env): backend e frontend são processos/serviços
    // separados em produção, não dá pra garantir que os dois leem a mesma
    // variável — se `UPLOAD_MAX_SIZE_BYTES` mudar no backend, ajuste este
    // valor também. A margem sobre 5 MB cobre o envelope multipart; o
    // resize no browser (`resize-image.ts`) já reduz a maioria das fotos
    // bem abaixo disso antes de chegar aqui.
    serverActions: {
      bodySizeLimit: "6mb",
    },
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

// Etapa 12.2 (ADR 0013, corrige C1) — Content-Security-Policy saiu daqui:
// nonce por requisição exige decidir o header a cada hit, isso é trabalho
// do proxy (`proxy.ts`), não de config estático de build. Os headers que
// não variam por requisição continuam aqui.
async function headers() {
  return [
    {
      source: '/:path*',
      headers: [
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