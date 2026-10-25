import * as Sentry from "@sentry/nextjs";

// Etapa 10.2 — adapter opcional, lado servidor. Sem SENTRY_DSN (dev
// padrão), não inicializa nada.
export async function register() {
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
        });
    }
}

export const onRequestError = Sentry.captureRequestError;
