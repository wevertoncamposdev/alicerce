import { Global, Module } from '@nestjs/common';
import { MAIL_PROVIDER, MailProvider } from './mail-provider.interface';
import { ConsoleMailProvider } from './console.provider';
import { SmtpMailProvider } from './smtp.provider';
import { ResendMailProvider } from './resend.provider';
import { MailService } from './mail.service';

// Mesmo padrão do StorageModule (ADR 0010): @Global(), a escolha do driver
// é feita aqui, uma vez — só esta factory sabe que MAIL_DRIVER existe.
@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      useFactory: (): MailProvider => {
        const driver = process.env.MAIL_DRIVER ?? 'console';
        if (driver === 'smtp') return new SmtpMailProvider();
        if (driver === 'resend') return new ResendMailProvider();
        return new ConsoleMailProvider();
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
