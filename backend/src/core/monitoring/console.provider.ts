import { Logger } from '@nestjs/common';
import type {
  MonitoringContext,
  MonitoringProvider,
} from './monitoring-provider.interface';

// Driver default — não manda nada pra fora, só loga. É o comportamento que
// já existia antes da etapa 10.2 (AllExceptionsFilter só logava), preservado
// quando MONITORING_DRIVER não está setado. Nunca registrado diretamente no
// container de DI — ver monitoring.module.ts.
export class ConsoleMonitoringProvider implements MonitoringProvider {
  private readonly logger = new Logger('ConsoleMonitoringProvider');

  captureException(error: unknown, context?: MonitoringContext): void {
    const stack = error instanceof Error ? error.stack : String(error);
    this.logger.error(`Erro não tratado (${context?.url ?? '-'})`, stack);
  }
}
