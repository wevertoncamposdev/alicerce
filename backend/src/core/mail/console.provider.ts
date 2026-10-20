import { Logger } from '@nestjs/common';
import type { MailMessage, MailProvider } from './mail-provider.interface';

// Driver de dev (default) — não envia nada de verdade, só loga o e-mail
// completo. Nunca registrado diretamente no container de DI — ver
// mail.module.ts ("nenhum código fora do adapter conhece o provedor").
export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger('ConsoleMailProvider');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `E-mail (console) para ${message.to} — assunto: "${message.subject}"\n${message.text}`,
    );
    return Promise.resolve();
  }
}
