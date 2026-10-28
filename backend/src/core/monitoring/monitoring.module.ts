import { Global, Module } from '@nestjs/common';
import {
  MONITORING_PROVIDER,
  MonitoringProvider,
} from './monitoring-provider.interface';
import { ConsoleMonitoringProvider } from './console.provider';
import { SentryMonitoringProvider } from './sentry.provider';
import { MonitoringService } from './monitoring.service';

// Mesmo padrão do MailModule/StorageModule (ADR 0010/0011): @Global(), a
// escolha do driver é feita aqui, uma vez — só esta factory sabe que
// MONITORING_DRIVER existe.
@Global()
@Module({
  providers: [
    {
      provide: MONITORING_PROVIDER,
      useFactory: (): MonitoringProvider => {
        const driver = process.env.MONITORING_DRIVER ?? 'console';
        if (driver === 'sentry') return new SentryMonitoringProvider();
        return new ConsoleMonitoringProvider();
      },
    },
    MonitoringService,
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
