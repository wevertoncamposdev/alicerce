import type { MailMessage, MailProvider } from './mail-provider.interface';

const RESEND_API_URL = 'https://api.resend.com/emails';

// Driver de produção via Resend — API REST simples o suficiente pra não
// justificar um SDK novo (é só um POST com Bearer). Nunca registrado
// diretamente no container de DI, ver console.provider.ts/smtp.provider.ts.
export class ResendMailProvider implements MailProvider {
  private readonly apiKey: string;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;

    if (!apiKey || !from) {
      throw new Error('MAIL_DRIVER=resend exige RESEND_API_KEY e MAIL_FROM');
    }

    this.apiKey = apiKey;
    this.from = from;
  }

  async send(message: MailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Falha ao enviar e-mail via Resend (${response.status}): ${body}`,
      );
    }
  }
}
