import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_PROVIDER } from './mail-provider.interface';
import type { MailMessage, MailProvider } from './mail-provider.interface';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * O que o resto do app injeta — nunca `MailProvider` diretamente (ver ADR
 * 0011, mesmo papel que `FilesService` tem sobre `StorageProvider`).
 * Falha depois de todas as tentativas nunca derruba quem chamou: e-mail é
 * best-effort, o fluxo de negócio (login, convite, troca de senha...)
 * segue de qualquer forma.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  async send(message: MailMessage): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.provider.send(message);
        return;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          this.logger.error(
            `Falha ao enviar e-mail para ${message.to} após ${MAX_ATTEMPTS} tentativas`,
            error instanceof Error ? error.stack : String(error),
          );
          return;
        }
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }
}
