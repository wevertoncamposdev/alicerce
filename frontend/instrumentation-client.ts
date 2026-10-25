import * as Sentry from "@sentry/nextjs";

// Etapa 10.2 — adapter opcional. Sem NEXT_PUBLIC_SENTRY_DSN (dev padrão),
// não inicializa nada: comportamento de hoje (nenhum reporte) preservado.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
    });
}
