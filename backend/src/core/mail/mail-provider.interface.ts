// Nenhum código fora do adapter conhece o provedor ativo — quem precisa de
// e-mail injeta `MailService` (que injeta este token internamente), nunca
// os adapters diretamente (ver ADR 0011, mesmo padrão de core/storage).
export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}
