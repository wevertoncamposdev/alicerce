import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@core/prisma/prisma.service';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  // Nosso Prisma "falso"
  const prismaMock = {
    favorite: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,

        // Sempre que o FavoritesService pedir um PrismaService,
        // entregue o prismaMock.
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);

    // Limpa chamadas anteriores do mock
    jest.clearAllMocks();
  });

  it('deve criar um favorito', async () => {
    // Arrange (Preparação)

    const dto = {
      title: 'NestJS',
      url: 'https://nestjs.com',
      userId: 'user-1',
    };

    const favoriteCreated = {
      id: '1',
      title: 'NestJS',
      url: 'https://nestjs.com',
      userId: 'user-1',
    };

    // Quando alguém chamar prisma.favorite.create(),
    // devolva favoriteCreated.
    prismaMock.favorite.create.mockResolvedValue(favoriteCreated);

    // Act (Execução)

    const result = await service.create(dto);

    // Assert (Verificação)

    expect(prismaMock.favorite.create).toHaveBeenCalledWith({
      data: {
        title: 'NestJS',
        url: 'https://nestjs.com',
        userId: 'user-1',
      },
    });

    expect(result).toEqual(favoriteCreated);
  });
});