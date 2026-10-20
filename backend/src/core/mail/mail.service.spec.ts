import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MAIL_PROVIDER } from './mail-provider.interface';

describe('MailService', () => {
  const sendMock = jest.fn<Promise<void>, [unknown]>();
  const providerMock = { send: sendMock };

  let service: MailService;

  const message = {
    to: 'user@example.com',
    subject: 'Assunto',
    html: '<p>Oi</p>',
    text: 'Oi',
  };

  beforeEach(async () => {
    sendMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MAIL_PROVIDER, useValue: providerMock },
      ],
    }).compile();

    service = module.get(MailService);
  });

  it('entrega na primeira tentativa quando o provider funciona', async () => {
    sendMock.mockResolvedValueOnce(undefined);

    await service.send(message);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(message);
  });

  it('tenta de novo depois de uma falha e entrega na segunda tentativa', async () => {
    sendMock
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(undefined);

    await service.send(message);

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('esgota as tentativas, loga o erro e nunca lança (fire-and-forget)', async () => {
    sendMock.mockRejectedValue(new Error('provider fora do ar'));

    await expect(service.send(message)).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(3);
  });
});
