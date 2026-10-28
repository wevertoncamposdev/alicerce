import { UserRepository } from './user.repository';
import { PrismaService } from '@core/prisma/prisma.service';

describe('UserRepository.anonymizeById (etapa 9.3, LGPD)', () => {
  it('anonimiza nome/e-mail e libera o e-mail original pra reuso', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { user: { update } } as unknown as PrismaService;
    const repository = new UserRepository(prisma);

    await repository.anonymizeById('user-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        deletedAt: expect.any(Date),
        status: 'INACTIVE',
        name: null,
        email: 'deleted-user-1@anon.invalid',
      },
    });
  });
});
