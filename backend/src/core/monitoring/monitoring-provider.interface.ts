// Nenhum código fora do adapter conhece o provedor ativo — quem precisa
// reportar um erro injeta `MonitoringService` (que injeta este token
// internamente), nunca os adapters diretamente (mesmo padrão de
// core/mail, ADR 0011).
export const MONITORING_PROVIDER = Symbol('MONITORING_PROVIDER');

export interface MonitoringContext {
  method?: string;
  url?: string;
  correlationId?: string;
}

export interface MonitoringProvider {
  captureException(error: unknown, context?: MonitoringContext): void;
}
