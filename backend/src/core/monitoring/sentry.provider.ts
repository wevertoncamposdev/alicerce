import * as Sentry from '@sentry/node';
import type {
  MonitoringContext,
  MonitoringProvider,
} from './monitoring-provider.interface';

// Só inicializa de verdade se SENTRY_DSN existir — sem DSN o SDK do Sentry
// não manda nada (no-op), então ligar MONITORING_DRIVER=sentry sem DSN em
// dev não quebra nada, só não reporta (mesmo espírito do Storage/Mail:
// falha de configuração aparece no uso, não no boot).
export class SentryMonitoringProvider implements MonitoringProvider {
  constructor() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
    });
  }

  captureException(error: unknown, context?: MonitoringContext): void {
    Sentry.captureException(error, {
      tags: {
        method: context?.method,
        url: context?.url,
        correlationId: context?.correlationId,
      },
    });
  }
}
