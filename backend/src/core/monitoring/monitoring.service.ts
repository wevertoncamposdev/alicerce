import { Inject, Injectable } from '@nestjs/common';
import { MONITORING_PROVIDER } from './monitoring-provider.interface';
import type {
  MonitoringContext,
  MonitoringProvider,
} from './monitoring-provider.interface';

// O que o resto do app injeta — nunca `MonitoringProvider` diretamente
// (mesmo papel que `MailService` tem sobre `MailProvider`).
@Injectable()
export class MonitoringService {
  constructor(
    @Inject(MONITORING_PROVIDER) private readonly provider: MonitoringProvider,
  ) {}

  captureException(error: unknown, context?: MonitoringContext): void {
    this.provider.captureException(error, context);
  }
}
