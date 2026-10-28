import * as nodemailer from 'nodemailer';
import type { MailMessage, MailProvider } from './mail-provider.interface';

// Driver de produção via SMTP genérico — nunca registrado diretamente no
// container de DI, ver local-disk.provider.ts/s3.provider.ts (Fase 6) para
// o mesmo padrão.
export class SmtpMailProvider implements MailProvider {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.MAIL_FROM;

    if (!host || !port || !user || !password || !from) {
      throw new Error(
        'MAIL_DRIVER=smtp exige SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD e MAIL_FROM',
      );
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass: password },
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
