import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@core/prisma/prisma.service';
import { NotesService } from '@core/metadata/notes/notes.service';
import { RecordTagsService } from '@core/metadata/tags/record-tags.service';
import { FilesService } from '@core/files/file.service';
import { FeedbacksService } from './feedbacks.service';

describe('FeedbacksService', () => {
  let service: FeedbacksService;

  const prismaMock = {
    feedback: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const notesServiceMock = { removeForRecord: jest.fn() };
  const recordTagsServiceMock = { removeForRecord: jest.fn() };
  const filesServiceMock = { removeAllForOwner: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbacksService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotesService, useValue: notesServiceMock },
        { provide: RecordTagsService, useValue: recordTagsServiceMock },
        { provide: FilesService, useValue: filesServiceMock },
      ],
    }).compile();

    service = module.get<FeedbacksService>(FeedbacksService);
  });

  it('deve criar um feedback com o tenantId e o autor do contexto', async () => {
    const created = {
      id: '1',
      tenantId: 'tenant-1',
      title: 'Teste',
      description: 'Descrição',
      createdById: 'user-1',
      status: 'RECEIVED',
    };
    prismaMock.feedback.create.mockResolvedValueOnce(created);

    const result = await service.create(
      { title: 'Teste', description: 'Descrição' },
      'tenant-1',
      'user-1',
    );

    expect(prismaMock.feedback.create).toHaveBeenCalledWith({
      data: {
        title: 'Teste',
        description: 'Descrição',
        tenantId: 'tenant-1',
        createdById: 'user-1',
      },
    });
    expect(result).toEqual(created);
  });

  it('deve criar um feedback sem description (fluxo de criação pelo Detail)', async () => {
    const created = {
      id: '1',
      tenantId: 'tenant-1',
      title: 'Teste',
      description: '',
      createdById: 'user-1',
      status: 'RECEIVED',
    };
    prismaMock.feedback.create.mockResolvedValueOnce(created);

    const result = await service.create(
      { title: 'Teste' },
      'tenant-1',
      'user-1',
    );

    expect(prismaMock.feedback.create).toHaveBeenCalledWith({
      data: {
        title: 'Teste',
        tenantId: 'tenant-1',
        createdById: 'user-1',
      },
    });
    expect(result).toEqual(created);
  });

  it('search filtra por tenantId', async () => {
    prismaMock.feedback.findMany.mockResolvedValueOnce([]);
    prismaMock.feedback.count.mockResolvedValueOnce(0);

    await service.search({}, 'tenant-1');

    expect(prismaMock.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ tenantId: 'tenant-1' }),
      }),
    );
  });

  it('updateStatus troca apenas o status, sem tocar outros campos', async () => {
    const existing = {
      id: '1',
      tenantId: 'tenant-1',
      title: 'Teste',
      status: 'RECEIVED',
    };
    prismaMock.feedback.findUnique.mockResolvedValueOnce(existing);
    prismaMock.feedback.update.mockResolvedValueOnce({
      ...existing,
      status: 'PLANNED',
    });

    const result = await service.updateStatus('1', 'PLANNED', 'tenant-1');

    expect(prismaMock.feedback.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { status: 'PLANNED' },
    });
    expect(result.status).toBe('PLANNED');
  });

  it('updateStatus lança 404 se o feedback for de outro tenant', async () => {
    prismaMock.feedback.findUnique.mockResolvedValueOnce({
      id: '1',
      tenantId: 'tenant-other',
      status: 'RECEIVED',
    });

    await expect(
      service.updateStatus('1', 'PLANNED', 'tenant-1'),
    ).rejects.toThrow();
  });

  it('remove limpa notas, tags e anexos (U6) antes de apagar o feedback', async () => {
    const existing = { id: '1', tenantId: 'tenant-1', title: 'Teste' };
    prismaMock.feedback.findUnique.mockResolvedValueOnce(existing);
    prismaMock.feedback.delete.mockResolvedValueOnce(existing);

    await service.remove('1', 'tenant-1');

    expect(notesServiceMock.removeForRecord).toHaveBeenCalledWith(
      'feedback',
      '1',
      'tenant-1',
    );
    expect(recordTagsServiceMock.removeForRecord).toHaveBeenCalledWith(
      'feedback',
      '1',
      'tenant-1',
    );
    expect(filesServiceMock.removeAllForOwner).toHaveBeenCalledWith(
      'feedback',
      '1',
      'tenant-1',
    );
    expect(prismaMock.feedback.delete).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
