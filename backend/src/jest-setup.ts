const buildModelMock = () => ({
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

jest.mock('@core/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    user: buildModelMock(),
    team: buildModelMock(),
  })),
}));

jest.mock('@core/prisma/prisma-bootstrap.service', () => ({
  PrismaBootstrapService: jest.fn().mockImplementation(() => ({
    user: buildModelMock(),
    team: buildModelMock(),
  })),
}));
