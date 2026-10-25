import { Injectable } from '@nestjs/common';
import type {
  MailMessage,
  MailProvider,
} from '@core/mail/mail-provider.interface';

// Substitui o MAIL_PROVIDER real nesta suíte (override de DI em
// helpers/app.ts, não em core/mail/ — etapa 12.1 não toca core/). Guarda os
// e-mails enviados em memória por destinatário, pra ler o token de
// convite/reset/verificação sem depender do log (AccountToken nunca manda o
// token em claro em outro lugar — ver auth.service.ts, ex. linha 706: o
// token só existe na URL embutida no corpo do e-mail).
@Injectable()
export class InMemoryMailProvider implements MailProvider {
  private readonly sent = new Map<string, MailMessage[]>();

  async send(message: MailMessage): Promise<void> {
    const list = this.sent.get(message.to) ?? [];
    list.push(message);
    this.sent.set(message.to, list);
  }

  getLastMessageTo(recipient: string): MailMessage | undefined {
    const list = this.sent.get(recipient);
    return list?.[list.length - 1];
  }

  getLastTokenFor(recipient: string): string {
    const message = this.getLastMessageTo(recipient);
    const match = message?.text.match(/token=([\w-]+)/);
    if (!match) {
      throw new Error(
        `Nenhum e-mail com token encontrado para ${recipient} (InMemoryMailProvider).`,
      );
    }
    return match[1];
  }

  reset(): void {
    this.sent.clear();
  }
}
